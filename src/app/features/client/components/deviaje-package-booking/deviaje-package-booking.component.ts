import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { CommonModule } from '@angular/common';
import {
  FlightBookingDto,
  FlightOfferDto,
  HotelBookingDto,
  PaymentDto,
  TravelerDto,
} from '../../models/bookings';
import { DeviajeTravelerFormComponent } from '../deviaje-traveler-form/deviaje-traveler-form.component';
import { DeviajePaymentsFormComponent } from '../deviaje-payments-form/deviaje-payments-form.component';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Subscription } from 'rxjs';
import { DeviajeFlightBookingSummaryComponent } from '../deviaje-flight-booking-summary/deviaje-flight-booking-summary.component';
import { DeviajePriceDetailsComponent } from '../deviaje-price-details/deviaje-price-details.component';
import {
  HotelResponseDto,
  HotelSearchRequest,
  HotelSearchResponse,
} from '../../../../shared/models/hotels';
import { FlightSearchRequest } from '../../../../shared/models/flights';
import { DeviajeHotelBookingSummaryComponent } from '../deviaje-hotel-booking-summary/deviaje-hotel-booking-summary.component';
import { BaseResponse } from '../../../../shared/models/baseResponse';

@Component({
  selector: 'app-deviaje-flight-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeviajeTravelerFormComponent,
    DeviajePaymentsFormComponent,
    DeviajeFlightBookingSummaryComponent,
    DeviajePriceDetailsComponent,
    DeviajeHotelBookingSummaryComponent,
  ],
  templateUrl: './deviaje-package-booking.component.html',
  styleUrl: './deviaje-package-booking.component.scss',
})
export class DeviajePackageBookingComponent implements OnInit, OnDestroy {
  @ViewChild(DeviajePaymentsFormComponent)
  paymentComponent!: DeviajePaymentsFormComponent;

  //Datos para la sessionStorage
  private readonly BOOKING_STATE_KEY = 'package_booking_state';
  private readonly FORM_DATA_KEY = 'package_booking_form_data';
  private readonly CURRENT_STEP_KEY = 'package_booking_current_step';
  private isReloadedSession = false; // Indica si la sesión se recargó. para diferenciar de la primera carga

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  //Servicios para reserva, autenticacion y utilidades
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  readonly flightUtils = inject(FlightUtilsService);
  subscription = new Subscription();

  @ViewChild(DeviajePriceDetailsComponent)
  priceDetailsComponent!: DeviajePriceDetailsComponent;
  calculatedTotalAmount: string = '0';
  calculatedCurrency: string = 'ARS';

  flightOffer: FlightOfferDto = {} as FlightOfferDto;
  searchParams: any = null;
  currentUser: any = null;
  origin: string = '';
  destination: string = '';
  flightSearchParams: FlightSearchRequest | null = null;
  hotelDetails: HotelResponseDto | null = null;
  hotel: HotelSearchResponse.Hotel | null = null;
  nameRoom: string = '';
  rate: HotelSearchResponse.Rate = {} as HotelSearchResponse.Rate;
  rateKey: string = '';
  recheck: boolean = false;
  hotelSearchParams: HotelSearchRequest | null = null;
  packageInfo: any = null;

  isLoading = false;
  isVerifying = false;
  currentStep = 1;
  totalSteps = 3;
  showSuccessMessage = false;
  bookingReference = '';
  errorMessage = '';
  isLoggedIn: boolean = false;
  userRole: string = '';

  // User selection for agents (AGREGAR ESTAS VARIABLES)
  showUserSelection = false;
  selectedClientId: string | null = null;
  isGuestBooking = true;

  mainForm: FormGroup = this.fb.group({
    travelers: this.fb.array([]),
    payment: this.fb.group({
      cardNumber: ['', [Validators.required]], // Validators.pattern(/^\d{16}$/)
      cardholderName: ['', Validators.required],
      expiryDate: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)],
      ],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      amount: [0, Validators.required],
      currency: ['ARS', Validators.required],
      paymentToken: [''],
      payerDni: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{7,8}$/),
          Validators.minLength(7),
        ],
      ],
    }),
  });

  loadPackageData(): void {
    const state = window.history.state;
    console.log('📦 Loading package data from state:', state);

    if (state && state.flightOffer && state.hotelDetails) {
      // Datos de vuelo
      this.flightOffer = state.flightOffer;
      this.flightSearchParams = state.flightSearchParams;

      // ✅ CORRECCIÓN: Extraer searchParams del flightSearchParams
      if (this.flightSearchParams) {
        this.searchParams = {
          adults: this.flightSearchParams.adults || 1,
          children: this.flightSearchParams.children || 0,
          infants: this.flightSearchParams.infants || 0,
        };
        console.log('👥 SearchParams extraídos:', this.searchParams);
      } else {
        // Fallback si no hay flightSearchParams
        console.log('⚠️ No flightSearchParams, usando valores por defecto');
        this.searchParams = {
          adults: 1,
          children: 0,
          infants: 0,
        };
      }

      // Datos de hotel
      this.hotelDetails = state.hotelDetails;
      this.hotel = state.hotel;
      this.nameRoom = state.nameRoom || '';
      this.rate = state.rate;
      this.rateKey = state.rateKey || '';
      this.recheck = state.recheck;
      this.hotelSearchParams = state.hotelSearchParams;

      // Datos del paquete
      this.packageInfo = state.packageInfo;

      console.log('✅ Package data loaded successfully');
      console.log('🛫 FlightOffer:', this.flightOffer);
      console.log('🏨 HotelDetails:', this.hotelDetails);
      console.log('👥 SearchParams:', this.searchParams);

      // ✅ CORRECCIÓN: Inicializar el formulario de travelers después de cargar los datos
      this.initializeTravelersForm();

      // Guardar el estado en sessionStorage
      this.saveBookingState();
    } else {
      console.error('❌ No package data found in state');
      this.router.navigate(['/home/packages/search']);
    }
  }

  get travelers(): FormArray {
    return this.mainForm.get('travelers') as FormArray;
  }

  // Método helper para obtener un control como FormGroup para usar en el template
  getTravelerFormGroup(index: number): FormGroup {
    return this.travelers.at(index) as FormGroup;
  }

  // Método helper para obtener el payment form como FormGroup
  get paymentFormGroup(): FormGroup {
    return this.mainForm.get('payment') as FormGroup;
  }

  ngOnInit(): void {
    console.log('📦 DeviajePackageBookingComponent iniciando...');

    this.loadPackageData(); // ✅ Ahora incluye inicialización del formulario
    this.loadCurrentUser();
    this.setupFormPersistence();

    // Verificar oferta de vuelo solo si existe
    if (this.flightOffer && Object.keys(this.flightOffer).length > 0) {
      this.verifyFlightOffer(this.flightOffer);
    }

    // Verificar hotel solo si es necesario
    if (this.recheck) {
      this.verifyHotelRateAvailability();
    }

    // ✅ DEBUG: Verificar estado después de la inicialización
    setTimeout(() => {
      console.log('🔍 Estado final después de ngOnInit:');
      console.log('   - SearchParams:', this.searchParams);
      console.log('   - Travelers FormArray length:', this.travelers.length);
      console.log('   - FlightOffer presente:', !!this.flightOffer);
      console.log('   - HotelDetails presente:', !!this.hotelDetails);
    }, 100);
  }

  ngOnDestroy(): void {
    // Limpiar datos de sessionStorage cuando se destruye el componente
    if (typeof window !== 'undefined') {
      this.clearPersistedState();
    }
    this.isReloadedSession = false; // Resetear el estado de recarga
    this.subscription.unsubscribe(); // Limpiar suscripciones
  }

  onPricesCalculated(pricesDto: any): void {
    console.log('Precios calculados recibidos:', pricesDto);

    this.calculatedTotalAmount = String(pricesDto.totalAmount);
    this.calculatedCurrency = pricesDto.currency;

    this.mainForm
      .get('payment')
      ?.get('amount')
      ?.setValue(pricesDto.totalAmount);
    this.mainForm.get('payment')?.get('currency')?.setValue(pricesDto.currency);
  }

  // Load current user and determine role (AGREGAR MÉTODO COMPLETO)
  loadCurrentUser(): void {
    // Suscribirse al usuario actual
    this.subscription.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoggedIn = !!user;
          console.log('Flight booking - Usuario:', user);
          this.setupBookingBasedOnRole();
        },
        error: (error) => {
          console.log('Flight booking - No user logged in');
          this.isLoggedIn = false;
          this.setupBookingBasedOnRole();
        },
      })
    );

    // Suscribirse a cambios de rol activo
    this.subscription.add(
      this.authService.activeRole$.subscribe((role) => {
        console.log('Flight booking - Active role changed to:', role);
        this.userRole = role || '';
        this.setupBookingBasedOnRole();
      })
    );
  }

  // Setup booking flow based on user role (AGREGAR MÉTODO COMPLETO)
  setupBookingBasedOnRole(): void {
    console.log('Flight booking - Setting up based on role:', this.userRole);

    // BLOQUEAR ADMINISTRADOR
    if (this.userRole === 'ADMINISTRADOR') {
      this.router.navigate(['/admin']);
      return;
    }

    if (!this.isLoggedIn) {
      // Usuario no logueado - reserva como invitado
      this.isGuestBooking = true;
      this.showUserSelection = false;
    } else if (this.userRole === 'CLIENTE') {
      // Cliente logueado - NO mostrar selector, auto-llenar
      this.isGuestBooking = false;
      this.selectedClientId = this.currentUser?.id;
      this.showUserSelection = false; // CLIENTE no ve selector
      this.prefillUserData();
    } else if (this.userRole === 'AGENTE') {
      // Solo AGENTE ve el selector
      this.showUserSelection = true;
      this.isGuestBooking = true; // Por defecto invitado
    }

    console.log(
      'Flight booking - Updated flags - showUserSelection:',
      this.showUserSelection,
      'isGuestBooking:',
      this.isGuestBooking
    );
  }

  // Agent functions - User selection (AGREGAR MÉTODOS)
  onBookingTypeChange(isGuest: boolean): void {
    this.isGuestBooking = isGuest;
    this.selectedClientId = null;
  }

  onUserSelected(clientId: string): void {
    this.selectedClientId = clientId;
    this.isGuestBooking = false;
    console.log('Flight booking - Selected client ID:', clientId);
  }

  // Prefill user data for logged clients (AGREGAR MÉTODO)
  prefillUserData(): void {
    if (this.currentUser && this.userRole === 'CLIENTE') {
      // Auto-llenar datos del primer pasajero con datos del usuario
      const firstTraveler = this.travelers.at(0) as FormGroup;
      if (firstTraveler) {
        firstTraveler.patchValue({
          firstName: this.currentUser.firstName || '',
          lastName: this.currentUser.lastName || '',
        });

        // Auto-llenar contacto
        const contactGroup = firstTraveler.get('contact') as FormGroup;
        if (contactGroup) {
          contactGroup.patchValue({
            emailAddress: this.currentUser.email || '',
          });

          const phonesArray = contactGroup.get('phones') as FormArray;
          if (phonesArray && phonesArray.length > 0) {
            phonesArray.at(0)?.patchValue({
              number: this.currentUser.phone || '',
            });
          }
        }
      }
    }
  }

  verifyFlightOffer(offer: FlightOfferDto): void {
    this.isVerifying = true;
    this.errorMessage = '';
    console.log('Verificando oferta de vuelo:', offer);

    this.bookingService.verifyFlightOfferPrice(offer).subscribe({
      next: (verifiedOffer) => {
        this.isVerifying = false;
        if (verifiedOffer) {
          this.flightOffer = verifiedOffer;

          this.saveBookingState();
        } else {
          // Mostrar mensaje temporal y redirigir
          this.errorMessage =
            'La oferta de vuelo ya no está disponible. Regresa a los resultados...';
        }
      },
      error: (error) => {
        this.isVerifying = false;
        this.errorMessage =
          'Error al verificar la disponibilidad. Regresando a los resultados...';

        console.error('Error verificando oferta:', error);

        // Redirigir después de 2 segundos para que el usuario vea el mensaje
        setTimeout(() => {
          this.router.navigate(['/home/flight/results'], {
            queryParamsHandling: 'preserve', // Mantener los parámetros de búsqueda
          });
        }, 2000);
      },
    });
  }

  initializeTravelersForm(): void {
    // Limpiar el FormArray primero
    while (this.travelers.length) {
      this.travelers.removeAt(0);
    }

    // Calcular el número total de pasajeros
    const totalPassengers =
      (this.searchParams?.adults || 0) +
      (this.searchParams?.children || 0) +
      (this.searchParams?.infants || 0);

    // Crear un formulario para cada pasajero
    for (let i = 0; i < totalPassengers; i++) {
      let travelerType = 'ADULT';

      // Determinar el tipo de pasajero según el índice
      if (i >= (this.searchParams?.adults || 0)) {
        if (
          i >=
          (this.searchParams?.adults || 0) + (this.searchParams?.children || 0)
        ) {
          travelerType = 'INFANT';
        } else {
          travelerType = 'CHILD';
        }
      }

      const travelerForm = this.fb.group({
        id: [String(i + 1)],
        ...(travelerType === 'INFANT'
          ? {
              dateOfBirth: ['', [Validators.required]],
            }
          : {}),
        firstName: ['', Validators.required], // Cambiado: firstName directamente en el grupo principal
        lastName: ['', Validators.required],
        gender: ['MALE', Validators.required],
        travelerType: [travelerType],
        ...(i === 0
          ? {
              contact: this.fb.group({
                emailAddress: ['', [Validators.required, Validators.email]],
                phones: this.fb.array([
                  this.fb.group({
                    deviceType: ['MOBILE'],
                    countryCallingCode: ['', Validators.required],
                    number: ['', Validators.required],
                  }),
                ]),
              }),
            }
          : {}),
        documents: this.fb.array([
          this.fb.group({
            documentType: ['PASSPORT'],
            number: ['', Validators.required],
            expiryDate: ['', Validators.required],
            issuanceCountry: ['', Validators.required],
            nationality: ['', Validators.required],
            holder: true,
          }),
        ]),
      });

      this.travelers.push(travelerForm);
    }
  }

  async nextStep(): Promise<void> {
    if (this.currentStep < this.totalSteps) {
      // Validar el paso actual antes de avanzar
      if (this.validateCurrentStep()) {
        if (this.currentStep === 2) {
          // Generar el token de pago antes de avanzar al paso 3
          if (!this.paymentComponent) {
            this.errorMessage = 'El componente de pago no está disponible';
            console.error('paymentComponent es undefined');
            return;
          }
          try {
            const paymentToken =
              await this.paymentComponent.requestPaymentToken();
            if (!paymentToken) {
              this.errorMessage = 'No se pudo generar el token de pago';
              return;
            }
            // Guardar el token en el formulario
            this.mainForm
              .get('payment')
              ?.get('paymentToken')
              ?.setValue(paymentToken);
            console.log('Token de pago generado en paso 2:', paymentToken);
          } catch (error: any) {
            this.errorMessage =
              error.message || 'Error al generar el token de pago';
            console.error('Error al generar token:', error);
            return;
          }
        }
        this.currentStep++;
        this.saveCurrentStep(); // Guardar el paso actual en sessionStorage
        console.log('Avanzando al paso:', this.currentStep);
      } else {
        console.log('Validación fallida para el paso:', this.currentStep);
        this.errorMessage =
          'Por favor, complete todos los campos requeridos correctamente.';
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.saveCurrentStep(); // Guardar el paso actual en sessionStorage
    }
  }

  validateCurrentStep(): boolean {
    // Según el paso actual, validar diferentes partes del formulario
    switch (this.currentStep) {
      case 1: // Validar datos de los viajeros
        return this.validateTravelersData();
      case 2: // Validar datos de pago
        return this.validatePaymentData();
      default:
        return true;
    }
  }

  //validateTravelersData(): boolean {
  // Marcar todos los campos como tocados para mostrar errores
  // this.markFormGroupTouched(this.travelers);

  // Verificar si los datos de los viajeros son válidos
  //return this.travelers.valid;
  // }

  validatePaymentData(): boolean {
    // Marcar todos los campos como tocados para mostrar errores
    this.markFormGroupTouched(this.mainForm.get('payment') as FormGroup);

    // Verificar si los datos de pago son válidos
    return this.mainForm.get('payment')?.valid || false;
  }

  markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // REEMPLAZAR el método submitBooking() existente con este:
  // REEMPLAZAR el método submitBooking() con esta versión optimizada:
  async submitBooking(): Promise<void> {
    // Validar que el formulario básico esté completo
    if (!this.validateCurrentStep()) {
      this.errorMessage = 'Complete todos los campos correctamente';
      return;
    }

    const paymentToken = this.mainForm
      .get('payment')
      ?.get('paymentToken')?.value;
    if (!paymentToken) {
      this.errorMessage =
        'Error: Token de pago no disponible. Regrese al paso anterior.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      console.log('🔐 Token de pago generado:', paymentToken);

      const pricesDto = this.priceDetailsComponent?.getPricesDto() || null;

      // ✅ MEJORADO: Obtener clientId y agentId una sola vez
      const clientId = this.getClientId();
      const agentId = this.getAgentId();

      // ✅ Preparar los datos de la reserva DE VUELO con estructura completa
      const flightBookingData: FlightBookingDto = {
        clientId: clientId,
        agentId: agentId,
        origin: this.origin,
        destination: this.destination,
        flightOffer: this.flightOffer,
        travelers: this.prepareTravelersData(),
        cancellationFrom: this.calculateFlightCancellationDate(),
        cancellationAmount: this.calculateFlightCancellationAmount(),
      };

      // ✅ Preparar los datos de la reserva DE HOTEL
      const hotelBookingData: HotelBookingDto = this.prepareHotelBookingData();

      // ✅ Asegurar que hotelBookingData también tenga clientId y agentId
      hotelBookingData.clientId = clientId;
      hotelBookingData.agentId = agentId;

      console.log('🛫 Datos de reserva de vuelo:', flightBookingData);
      console.log('🏨 Datos de reserva de hotel:', hotelBookingData);
      console.log(
        '🆔 DNI del pagador:',
        this.mainForm.get('payment')?.get('payerDni')?.value
      );

      // ✅ Preparar los datos del pago
      const paymentData: PaymentDto = {
        amount: this.mainForm.get('payment')?.get('amount')?.value,
        currency: this.mainForm.get('payment')?.get('currency')?.value,
        paymentMethod: 'master',
        paymentToken: paymentToken,
        installments: 1,
        description: 'Reserva de paquete (vuelo + hotel)',
        payer: {
          email: this.travelers.at(0)?.get('contact')?.get('emailAddress')
            ?.value,
          identification: this.mainForm.get('payment')?.get('payerDni')?.value,
          identificationType: 'DNI',
        },
      };

      console.log('💳 Datos de pago:', paymentData);
      console.log('💰 Precios DTO:', pricesDto);

      // ✅ Llamar al endpoint de PAQUETES (el BookingService ya maneja la estructura correcta)
      this.bookingService
        .createPackageBooking(
          flightBookingData,
          hotelBookingData,
          paymentData,
          pricesDto
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            console.log('📦 Respuesta del servidor:', response);

            if (response.success) {
              this.showSuccessMessage = true;
              this.bookingReference = response.data || '';
              this.errorMessage = '';

              this.clearPersistedState();

              setTimeout(() => {
                this.router.navigate(['/bookings'], {
                  queryParams: { reference: this.bookingReference },
                });
              }, 3000);
            } else {
              this.isLoading = false;
              this.handleBookingError(response);
            }
          },
        });
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage =
        error.message || 'Error al procesar el pago del paquete';
      console.error('❌ Error en submitBooking:', error);
    }
  }

  onOriginReceived(origin: string) {
    this.origin = origin;
    console.log('Origen recibido:', origin);
  }

  onDestinationReceived(destination: string) {
    this.destination = destination;
    console.log('Destino recibido:', destination);
  }

  private handleBookingError(response: BaseResponse<string>): void {
    this.errorMessage = response.message || 'Ocurrió un error inesperado';
  }

  private getClientId(): number | undefined {
    if (this.userRole === 'CLIENTE' && !this.isGuestBooking) {
      return this.currentUser?.id;
    } else if (
      this.userRole === 'AGENTE' &&
      !this.isGuestBooking &&
      this.selectedClientId
    ) {
      return parseInt(this.selectedClientId);
    }
    return undefined; // Para invitados
  }

  private getAgentId(): number | undefined {
    if (this.userRole === 'AGENTE') {
      return this.currentUser?.id;
    }
    return undefined;
  }

  prepareTravelersData(): TravelerDto[] {
    const travelersData: TravelerDto[] = [];
    const primaryContact = this.travelers.at(0)?.get('contact')?.value;

    const adults: number[] = [];
    const children: number[] = [];
    const infants: number[] = [];

    // Categorizar pasajeros por índice
    this.travelers.controls.forEach((travelerControl, index) => {
      const travelerType = travelerControl.value.travelerType;
      if (travelerType === 'ADULT') {
        adults.push(index);
      } else if (travelerType === 'CHILD') {
        children.push(index);
      } else if (travelerType === 'INFANT') {
        infants.push(index);
      }
    });

    this.travelers.controls.forEach((travelerControl, index) => {
      const traveler = travelerControl.value;

      // Determinar el ID del adulto asociado para infantes
      let associatedAdultId: string | undefined;
      if (traveler.travelerType === 'INFANT') {
        // Buscar un adulto disponible usando distribución más equitativa
        const infantIndexInArray = infants.indexOf(index);
        const adultIndex = adults[infantIndexInArray % adults.length]; // Distribución circular

        if (adultIndex !== undefined) {
          associatedAdultId = String(adultIndex + 1); // IDs empiezan en 1
        }
      }

      // Solo incluir campos necesarios según el tipo de pasajero
      const travelerData: TravelerDto = {
        id: traveler.id,
        ...(traveler.travelerType === 'INFANT' && traveler.dateOfBirth
          ? { dateOfBirth: traveler.dateOfBirth }
          : {}),
        name: {
          firstName: traveler.firstName,
          lastName: traveler.lastName,
        },
        gender: traveler.gender,
        documents: traveler.documents,
        travelerType: traveler.travelerType,
        ...(associatedAdultId && { associatedAdultId }),
      };

      if (index === 0 && primaryContact) {
        travelerData.contact = {
          emailAddress: primaryContact.emailAddress,
          phones: primaryContact.phones.map((phone: any) => ({
            deviceType: phone.deviceType || 'MOBILE',
            countryCallingCode: phone.countryCallingCode,
            number: phone.number,
          })),
        };
      }

      // Incluir documentos para todos los pasajeros
      if (traveler.documents && traveler.documents.length > 0) {
        const document = traveler.documents[0];
        if (document.number) {
          // Solo si tiene número de documento
          travelerData.documents = [
            {
              documentType: document.documentType || 'PASSPORT',
              number: document.number,
              expiryDate: document.expiryDate,
              issuanceCountry: document.issuanceCountry || 'AR',
              nationality: document.nationality || 'AR',
              holder: index === 0, // Solo el primer pasajero es el titular/holder
            },
          ];
        }
      }

      travelersData.push(travelerData);
    });

    console.log('Datos de pasajeros preparados:', travelersData);
    console.log('Distribución de asociaciones:', {
      adults: adults.map((i) => `Adulto ${i + 1}`),
      infants: infants.map((infantIndex, arrayIndex) => {
        const adultIndex = adults[arrayIndex % adults.length];
        return `Infante ${infantIndex + 1} → Adulto ${adultIndex + 1}`;
      }),
    });
    return travelersData;
  }

  private calculateFlightCancellationDate(): string {
    // 24 horas desde ahora
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // formato YYYY-MM-DD
  }

  private calculateFlightCancellationAmount(): number {
    // Después de 24h paga el precio completo del vuelo
    return parseFloat(this.flightOffer?.price?.total || '0');
  }

  private extractHotelCancellationDate(): string {
    try {
      // Usar this.rate directamente si tienes acceso a él, o this.hotelDetails
      const cancellationPolicies = this.rate?.cancellationPolicies;
      if (cancellationPolicies && cancellationPolicies.length > 0) {
        const from = cancellationPolicies[0]?.from;
        if (from) {
          // Convertir "2025-08-02T23:59:00-03:00" a "2025-08-02"
          return from.split('T')[0];
        }
      }
    } catch (error) {
      console.error(
        'Error extrayendo fecha de cancelación de HotelBeds:',
        error
      );
    }

    // Default: mañana si no hay política
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private extractHotelCancellationAmount(): number {
    try {
      const cancellationPolicies = this.rate?.cancellationPolicies;
      if (cancellationPolicies && cancellationPolicies.length > 0) {
        const amount = cancellationPolicies[0]?.amount;
        if (amount) {
          return parseFloat(amount); // "357.79" → 357.79
        }
      }
    } catch (error) {
      console.error(
        'Error extrayendo monto de cancelación de HotelBeds:',
        error
      );
    }

    // Default: precio total del hotel
    return this.calculatedTotalAmount
      ? parseFloat(this.calculatedTotalAmount)
      : 0;
  }

  //METODOS PRIVADOS PARA GUARDAR LA SESION
  private loadPersistedState(): void {
    try {
      console.log('📂 Cargando estado persistido...');

      // Cargar el paso actual
      const savedStep = sessionStorage.getItem(this.CURRENT_STEP_KEY);
      if (savedStep) {
        this.currentStep = parseInt(savedStep, 10);
        this.isReloadedSession = true;
        console.log(`📋 Paso cargado: ${this.currentStep}`);
      }

      // Cargar los datos del estado de la reserva
      const savedState = sessionStorage.getItem(this.BOOKING_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);

        // Datos de vuelo
        this.flightOffer = state.flightOffer;
        this.flightSearchParams = state.flightSearchParams;
        this.searchParams = state.searchParams;

        // Datos de hotel
        this.hotelDetails = state.hotelDetails;
        this.hotel = state.hotel;
        this.nameRoom = state.nameRoom;
        this.rate = state.rate;
        this.rateKey = state.rateKey;
        this.recheck = state.recheck;
        this.hotelSearchParams = state.hotelSearchParams;
        this.packageInfo = state.packageInfo;

        this.isReloadedSession = true;
        console.log('📦 Estado de paquete cargado desde sessionStorage');

        // ✅ Inicializar formulario si hay searchParams
        if (this.searchParams) {
          this.initializeTravelersForm();
        }
      }

      // Verificar oferta de vuelo si existe
      if (this.flightOffer && Object.keys(this.flightOffer).length > 0) {
        this.verifyFlightOffer(this.flightOffer);
      }

      // Cargar los datos del formulario
      const savedFormData = sessionStorage.getItem(this.FORM_DATA_KEY);
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);

        // Luego cargar los valores guardados
        setTimeout(() => {
          this.mainForm.patchValue(formData);
          console.log('📝 Datos del formulario restaurados');
        }, 100);

        this.isReloadedSession = true;
      }
    } catch (error) {
      console.error('❌ Error al cargar estado persistido:', error);
      this.clearPersistedState();
    }
  }

  private loadFromRouterState(): void {
    let state: any;

    if (typeof window !== 'undefined') {
      state = window.history.state;
    }

    if (state && state.flightOffer) {
      this.flightOffer = state.flightOffer;
      this.searchParams = state.searchParams;

      // Guardar el estado inicial
      this.saveBookingState();

      // Verificar disponibilidad y precio solo en la primera carga
      if (this.flightOffer) {
        this.verifyFlightOffer(this.flightOffer);
      }

      // Inicializar el formulario con los viajeros
      this.initializeTravelersForm();
    } else {
      // Si no hay datos en ningún lado, redirigir a la página de búsqueda
      this.router.navigate(['/home/flight/search']);
    }
  }

  private setupFormPersistence(): void {
    // Suscribirse a cambios en el formulario para guardar automáticamente
    this.mainForm.valueChanges.subscribe(() => {
      this.saveFormData();
    });
  }

  private saveBookingState(): void {
    try {
      const state = {
        flightOffer: this.flightOffer,
        flightSearchParams: this.flightSearchParams,
        searchParams: this.searchParams, // ✅ Guardar también searchParams
        hotelDetails: this.hotelDetails,
        hotel: this.hotel,
        nameRoom: this.nameRoom,
        rate: this.rate,
        rateKey: this.rateKey,
        recheck: this.recheck,
        hotelSearchParams: this.hotelSearchParams,
        packageInfo: this.packageInfo,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(this.BOOKING_STATE_KEY, JSON.stringify(state));
      console.log('💾 Estado del paquete guardado en sessionStorage');
    } catch (error) {
      console.error('Error al guardar estado de la reserva:', error);
    }
  }

  private saveFormData(): void {
    try {
      const formData = this.mainForm.value;
      sessionStorage.setItem(this.FORM_DATA_KEY, JSON.stringify(formData));
    } catch (error) {
      console.error('Error al guardar datos del formulario:', error);
    }
  }

  private saveCurrentStep(): void {
    try {
      sessionStorage.setItem(
        this.CURRENT_STEP_KEY,
        this.currentStep.toString()
      );
    } catch (error) {
      console.error('Error al guardar paso actual:', error);
    }
  }

  private clearPersistedState(): void {
    try {
      sessionStorage.removeItem(this.BOOKING_STATE_KEY);
      sessionStorage.removeItem(this.FORM_DATA_KEY);
      sessionStorage.removeItem(this.CURRENT_STEP_KEY);
    } catch (error) {
      console.error('Error al limpiar estado persistido:', error);
    }
  }

  // Estos metodos los puedo borrar son para ver errores en consola
  validateTravelersData(): boolean {
    // Marcar todos los campos como tocados para mostrar errores
    this.markFormGroupTouched(this.travelers);

    // Verificar si hay errores y registrarlos en la consola
    let hasErrors = false;

    // Recorrer cada viajero
    this.travelers.controls.forEach((travelerControl, travelerIndex) => {
      const travelerGroup = travelerControl as FormGroup;
      console.log(`Validando Viajero ${travelerIndex + 1}:`);

      // Verificar errores en los campos directos del viajero
      Object.keys(travelerGroup.controls).forEach((key) => {
        const control = travelerGroup.get(key);

        if (control && control.invalid) {
          console.log(`  - Campo '${key}' inválido:`, control.errors);
          hasErrors = true;

          // Si es un FormGroup o FormArray, explorar sus errores también
          if (control instanceof FormGroup) {
            this.logFormGroupErrors(control, `    • ${key}`);
          } else if (control instanceof FormArray) {
            this.logFormArrayErrors(control, `    • ${key}`);
          }
        }
      });
    });

    console.log('¿El formulario de viajeros es válido?', !hasErrors);
    console.log(
      'Estado del FormArray:',
      this.travelers.valid,
      this.travelers.errors
    );

    return this.travelers.valid;
  }

  // Función auxiliar para registrar errores en FormGroups anidados
  private logFormGroupErrors(formGroup: FormGroup, prefix: string): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);

      if (control && control.invalid) {
        console.log(`${prefix} > ${key}:`, control.errors);

        if (control instanceof FormGroup) {
          this.logFormGroupErrors(control, `${prefix} > ${key}`);
        } else if (control instanceof FormArray) {
          this.logFormArrayErrors(control, `${prefix} > ${key}`);
        }
      }
    });
  }

  // Función auxiliar para registrar errores en FormArrays anidados
  private logFormArrayErrors(formArray: FormArray, prefix: string): void {
    formArray.controls.forEach((control, index) => {
      if (control.invalid) {
        console.log(`${prefix}[${index}]:`, control.errors);

        if (control instanceof FormGroup) {
          this.logFormGroupErrors(control, `${prefix}[${index}]`);
        } else if (control instanceof FormArray) {
          this.logFormArrayErrors(control, `${prefix}[${index}]`);
        }
      }
    });
  }

  getLastArrivalDate(): string {
    const offer = this.flightOffer;

    if (!offer || !offer.itineraries || offer.itineraries.length === 0) {
      console.warn('No hay oferta de vuelo disponible');
      return new Date().toISOString().split('T')[0];
    }

    try {
      const lastItinerary = offer.itineraries[offer.itineraries.length - 1];
      const lastSegment =
        lastItinerary.segments[lastItinerary.segments.length - 1];
      const arrivalDate = lastSegment.arrival.at.split('T')[0];
      console.log('Fecha de llegada del último vuelo:', arrivalDate);
      return arrivalDate;
    } catch (error) {
      console.error('Error al obtener fecha de llegada:', error);
      return new Date().toISOString().split('T')[0];
    }
  }
  

  //**************************METODOS PARA LOS HOTELES********************************
  // En tu componente de package booking
  prepareHotelBookingData(): HotelBookingDto {
    const travelerData = this.travelers.at(0).value;

    // Determine clientId and agentId based on role and selection
    let clientId = null;
    let agentId = null;

    if (this.userRole === 'CLIENTE' && !this.isGuestBooking) {
      clientId = this.currentUser.id;
      agentId = null;
    } else if (this.userRole === 'AGENTE') {
      if (!this.isGuestBooking && this.selectedClientId) {
        clientId = parseInt(this.selectedClientId);
        agentId = this.currentUser.id;
      } else {
        clientId = null;
        agentId = this.currentUser.id;
      }
    }

    const contactInfo = travelerData.contact || {};
    const emailAddress = contactInfo.emailAddress || '';
    const phoneNumber = contactInfo.phones?.[0]?.number || '';

    // ✅ CONVERSIÓN DE TRAVELERS: flight mode → hotel mode
    const paxes = this.travelers.controls.map((travelerControl, index) => {
      const traveler = travelerControl.value;

      // Conversión de tipos:
      // 'ADULT' → 'AD'
      // 'CHILD' → 'CH'
      // 'INFANT' → 'CH'
      let hotelType = 'AD';
      if (
        traveler.travelerType === 'CHILD' ||
        traveler.travelerType === 'INFANT'
      ) {
        hotelType = 'CH';
      }

      return {
        roomId: 1, // Asumiendo 1 habitación por ahora
        type: hotelType, // 'AD' o 'CH' (formato HotelBeds)
        name: traveler.firstName,
        surname: traveler.lastName,
      };
    });

    return {
      clientId: clientId,
      agentId: agentId,
      holder: {
        name: travelerData.firstName,
        surname: travelerData.lastName,
        email: emailAddress,
        phone: phoneNumber,
      },
      rooms: [
        {
          rateKey: this.rateKey, // Viene del state
          roomName: this.nameRoom, // Viene del state
          boardName: (this.rate as any)?.boardName,
          paxes: paxes,
        },
      ],
      cancellationFrom: this.extractHotelCancellationDate(),
      cancellationAmount: this.extractHotelCancellationAmount(),
    };
  }

  // Agregar este método a tu package booking component
  verifyHotelRateAvailability(): void {
    this.isVerifying = true;
    this.errorMessage = '';

    this.subscription.add(
      this.bookingService.checkRates(this.rateKey).subscribe({
        next: (response) => {
          console.log('Hotel rate verification successful:', response);
          this.isVerifying = false;

          if (
            response &&
            response.hotel &&
            response.hotel.rooms &&
            response.hotel.rooms.length > 0
          ) {
            const room = response.hotel.rooms[0];
            if (room.rates && room.rates.length > 0) {
              const newRate = room.rates[0];

              // Verificar si el precio cambió
              const oldPrice = this.rate?.net || 0;
              const newPrice = parseFloat(newRate.net) || 0;

              if (oldPrice !== newPrice) {
                console.log(
                  'Hotel price changed from',
                  oldPrice,
                  'to',
                  newPrice
                );

                // Actualizar el rate en packageData
                this.rate = {
                  ...this.rate,
                  net: newPrice,
                  rateKey: newRate.rateKey,
                };
              } else {
                console.log('Hotel price confirmed:', newPrice);
              }
            }
          }
        },
        error: (error) => {
          console.error('Hotel rate verification failed:', error);
          this.isVerifying = false;
          this.errorMessage =
            'La tarifa del hotel ya no está disponible. Por favor, realice una nueva búsqueda.';
        },
      })
    );
  }
}
