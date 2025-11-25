import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { CommonModule } from '@angular/common';
import {
  BookingReferenceResponse,
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
import { ValidatorsService } from '../../../../shared/services/validators.service';
import {
  UserData,
  UserService,
} from '../../../../shared/services/user.service';
import { CountryService } from '../../../../shared/services/country.service';

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
  private readonly validatorService = inject(ValidatorsService);
  private readonly userService = inject(UserService);
  private readonly countryService = inject(CountryService);
  subscription = new Subscription();

  @ViewChild(DeviajePriceDetailsComponent)
  priceDetailsComponent!: DeviajePriceDetailsComponent;
  calculatedTotalAmount: number = 0;
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
  bookingReference: BookingReferenceResponse | null = null;

  isLoading = false;
  isVerifying = false;
  currentStep = 1;
  totalSteps = 3;
  showSuccessMessage = false;
  errorMessage = '';
  userErrorMessage = '';
  isLoggedIn: boolean = false;
  userRole: string = '';

  // User selection for agents (AGREGAR ESTAS VARIABLES)
  showUserSelection = false;
  selectedClientId: string | null = null;
  isGuestBooking = true;

  mainForm: FormGroup = this.fb.group({
    travelers: this.fb.array([]),
    payment: this.fb.group({
      cardNumber: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(19),
          this.paymentMethodValidator(),
        ],
      ],
      cardholderName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
        ],
      ],
      expiryDate: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)],
      ],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      amount: [0, Validators.required],
      currency: ['ARS', Validators.required],
      paymentToken: [''],
      payerDni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      detectedPaymentMethod: [''],
    }),
  });

  loadPackageData(): void {
    const state = window.history.state;

    if (state && state.flightOffer && state.hotelDetails) {
      // Datos de vuelo
      this.flightOffer = state.flightOffer;
      this.flightSearchParams = state.flightSearchParams;

      if (this.flightSearchParams) {
        this.searchParams = {
          adults: this.flightSearchParams.adults || 1,
          children: this.flightSearchParams.children || 0,
          infants: this.flightSearchParams.infants || 0,
        };
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

      this.saveBookingState();
      if (this.flightOffer) {
        this.verifyFlightOffer(this.flightOffer);
      } // Guardar el estado en sessionStorage
      this.initializeTravelersForm();
    } else {
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
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
    }

    if (!this.isReloadedSession) {
      this.loadPackageData();
    }

    this.loadCurrentUser();
    this.setupFormPersistence();
    this.verifyHotelRateAvailability();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      this.clearPersistedState();
    }
    this.isReloadedSession = false;
    this.subscription.unsubscribe();
  }

  onPricesCalculated(pricesDto: any): void {
    console.log('Precios calculados recibidos:', pricesDto);

    this.calculatedTotalAmount = pricesDto.totalAmount;
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
          this.setupBookingBasedOnRole();
        },
        error: (error) => {
          this.isLoggedIn = false;
          this.setupBookingBasedOnRole();
        },
      })
    );

    this.subscription.add(
      this.authService.activeRole$.subscribe((role) => {
        this.userRole = role || '';
        this.setupBookingBasedOnRole();
      })
    );
  }

  setupBookingBasedOnRole(): void {
    if (this.userRole === 'ADMINISTRADOR') {
      this.router.navigate(['/home']);
      return;
    }

    this.clearTravelersForm();

    if (!this.isLoggedIn) {
      // Usuario no logueado - reserva como invitado
      this.isGuestBooking = true;
      this.showUserSelection = false;
    } else if (this.userRole === 'CLIENTE') {
      // Cliente logueado - NO mostrar selector, auto-llenar
      this.isGuestBooking = false;
      this.selectedClientId = this.currentUser?.id;
      this.showUserSelection = false; // CLIENTE no ve selector
      this.loadUserDataAndPrefill(this.currentUser.username);
    } else if (this.userRole === 'AGENTE') {
      // Solo AGENTE ve el selector
      this.showUserSelection = true;
      this.isGuestBooking = true; // Por defecto invitado
    }
  }

  private loadUserDataAndPrefill(username: string): void {
    this.userService.getUserByUsername(username).subscribe({
      next: (userData) => {
        this.prefillUserData(userData);
      },
      error: (error) => {
        console.error('Error cargando datos del usuario:', error);
      },
    });
  }

  prefillUserData(userData: UserData): void {
    if (!userData) return;

    const firstTraveler = this.travelers.at(0) as FormGroup;
    if (firstTraveler) {
      firstTraveler.patchValue({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        gender: userData.gender || 'MALE',
        travelerType: 'ADULT',
      });

      const contactGroup = firstTraveler.get('contact') as FormGroup;
      if (contactGroup) {
        contactGroup.patchValue({
          emailAddress: userData.email || '',
        });

        const phonesArray = contactGroup.get('phones') as FormArray;
        if (phonesArray && phonesArray.length > 0) {
          phonesArray.at(0)?.patchValue({
            deviceType: 'MOBILE',
            countryCallingCode: userData.countryCallingCode || '',
            number: userData.phone || '',
          });
        }
      }

      if (userData.passport) {
        const documentsArray = firstTraveler.get('documents') as FormArray;
        if (documentsArray && documentsArray.length > 0) {
          documentsArray.at(0)?.patchValue({
            documentType: 'PASSPORT',
            number: userData.passport.passportNumber || '',
            expiryDate: userData.passport.expiryDate,
            issuanceCountry: userData.passport.issuanceCountry || 'AR',
            nationality: userData.passport.nationality || 'AR',
          });
        }
      }

      if (userData.birthDate) {
        firstTraveler.patchValue({
          dateOfBirth: userData.birthDate,
        });
      }
    }
  }

  private clearTravelersForm(): void {
    this.travelers.clear();
    this.initializeTravelersForm();
    this.errorMessage = '';
  }

  // Agent functions - User selection (AGREGAR MÉTODOS)
  onBookingTypeChange(isGuest: boolean): void {
    this.isGuestBooking = isGuest;
    this.selectedClientId = null;
  }

  searchUserByUsername(username: string): void {
    if (!username.trim()) return;

    if (username === this.currentUser?.username) {
      this.userErrorMessage = 'No puedes reservar para ti mismo siendo agente';
      return;
    }
    this.userErrorMessage = '';

    this.userService.getUserByUsername(username).subscribe({
      next: (userData) => {
        this.selectedClientId = userData.id.toString();
        this.isGuestBooking = false;
        this.clearTravelersForm();
        this.prefillUserData(userData);

        this.userErrorMessage = '';
      },
      error: () => {
        this.userErrorMessage =
          'Usuario no encontrado. Verifica el nombre de usuario.';
        this.selectedClientId = null;
        this.clearTravelersForm();
      },
    });
  }

  verifyFlightOffer(offer: FlightOfferDto): void {
    this.isVerifying = true;
    this.errorMessage = '';

    this.bookingService.verifyFlightOfferPrice(offer).subscribe({
      next: (verifiedOffer) => {
        this.isVerifying = false;
        if (verifiedOffer) {
          this.flightOffer = verifiedOffer.data.flightOffers[0];

          this.saveBookingState();
        } else {
          this.errorMessage =
            'La oferta de vuelo ya no está disponible. Regresando a los resultados...';
          setTimeout(() => {
            this.router.navigate(['/home/packages/results'], {
              queryParamsHandling: 'preserve',
            });
          }, 2000);
        }
      },
      error: (error) => {
        this.isVerifying = false;
        this.errorMessage = error.message;
        console.error('Error verificando oferta:', error);
        this.errorMessage =
          'Hubo un error al verificar la oferta. Regresando a los resultados...';

        setTimeout(() => {
          this.router.navigate(['/home/package/results'], {
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
        firstName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(30),
            this.validatorService.onlyLetters(),
          ],
        ],
        lastName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(30),
            this.validatorService.onlyLetters(),
          ],
        ],
        gender: ['MALE', Validators.required],
        travelerType: [travelerType],
        ...(i === 0
          ? {
              contact: this.fb.group({
                emailAddress: [
                  '',
                  [
                    Validators.required,
                    Validators.email,
                    this.validatorService.emailWithDomain(),
                    Validators.maxLength(80),
                  ],
                ],
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

      this.validatorService.autoUppercaseControl(travelerForm.get('firstName'));
      this.validatorService.autoUppercaseControl(travelerForm.get('lastName'));
      this.validatorService.autoUppercaseControl(
        travelerForm.get('documents.0.number')
      );

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
    const detectedPaymentMethod = this.mainForm
      .get('payment')
      ?.get('detectedPaymentMethod')?.value;

    this.isLoading = true;
    this.errorMessage = '';

    const pricesDto = this.priceDetailsComponent?.getPricesDto() || null;

    const clientId = this.getClientId();
    const agentId = this.getAgentId();

    this.fullFlightData();
    const flightBookingData: FlightBookingDto = {
      clientId: clientId,
      agentId: agentId,
      origin: this.origin,
      destination: this.destination,
      carrier: this.flightUtils.getAirlineName(this.flightOffer.validatingAirlineCodes[0]),
      flightOffer: this.flightOffer,
      travelers: this.prepareTravelersData(),
    };
    console.log(this.flightUtils.getAirlineName(this.flightOffer.validatingAirlineCodes[0]));

    const hotelBookingData: HotelBookingDto = this.prepareHotelBookingData();

    hotelBookingData.clientId = clientId;
    hotelBookingData.agentId = agentId;

    const amount = this.mainForm.get('payment')?.get('amount')?.value;
    const paymentData: PaymentDto = {
      amount: Math.round(amount * 100) / 100,
      currency: this.mainForm.get('payment')?.get('currency')?.value,
      paymentMethod: detectedPaymentMethod,
      type: 'PACKAGE',
      paymentToken: paymentToken,
      installments: 1,
      description: 'Reserva de paquete (vuelo + hotel)',
      payer: {
        email: this.travelers.at(0)?.get('contact')?.get('emailAddress')?.value,
        identification: this.mainForm.get('payment')?.get('payerDni')?.value,
        identificationType: 'DNI',
      },
    };

    this.bookingService
      .createPackageBooking(
        flightBookingData,
        hotelBookingData,
        paymentData,
        pricesDto
      )
      .subscribe({
        next: (bookingReference: BookingReferenceResponse) => {
          this.isLoading = false;
          this.showSuccessMessage = true;
          this.bookingReference = bookingReference;
          this.errorMessage = '';

          this.clearPersistedState();

          setTimeout(() => {
            this.router.navigate(['/bookings'], {
              queryParams: { reference: this.bookingReference },
            });
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          this.currentStep = 2;
          this.saveCurrentStep();
          this.errorMessage = error.message;

          if (error.status === 410) {
            this.errorMessage =
              'No repita la misma operación. Por favor, regrese a los resultados de búsqueda y seleccione una nueva tarifa.';
          }
          console.error('Error en booking:', error);
        },
      });
  }

  getAirportInfo(iataCode: string): string {
    return this.countryService.getAirportInfo(iataCode);
  }

  fullFlightData() {
    if (this.flightOffer) {
      const segments = this.flightOffer.itineraries[0].segments;
      const origin = segments[0].departure.iataCode;
      const destination = segments[segments.length - 1].arrival.iataCode;

      this.origin = this.getAirportInfo(origin);
      this.destination = this.getAirportInfo(destination);
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
    return travelersData;
  }

  //METODOS PRIVADOS PARA GUARDAR LA SESION
  private loadPersistedState(): void {
    try {
      // Cargar el paso actual
      const savedStep = sessionStorage.getItem(this.CURRENT_STEP_KEY);
      if (savedStep) {
        const stepNumber = parseInt(savedStep, 10);
        if (stepNumber >= 2) {
          this.currentStep = 2;
        } else {
          this.currentStep = stepNumber;
        }
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
      }

      // Verificar oferta de vuelo si existe
      if (this.flightOffer && Object.keys(this.flightOffer).length > 0) {
        this.verifyFlightOffer(this.flightOffer);
      }

      // Cargar los datos del formulario
      const savedFormData = sessionStorage.getItem(this.FORM_DATA_KEY);
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);

        if (this.searchParams) {
          this.initializeTravelersForm();
        }

        setTimeout(() => {
          this.mainForm.patchValue(formData);
        }, 100);

        this.isReloadedSession = true;
      }
    } catch (error) {
      console.error('❌ Error al cargar estado persistido:', error);
      this.clearPersistedState();
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
        searchParams: this.searchParams,
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
      const formData = JSON.parse(JSON.stringify(this.mainForm.value));

      if (formData.payment) {
        delete formData.payment.cardNumber; // Ahora solo borra de la copia
        delete formData.payment.expiryDate; // Ahora solo borra de la copia
        delete formData.payment.cvv; // Ahora solo borra de la copia
        delete formData.payment.paymentToken; // Ahora solo borra de la copia
      }

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
    const countryName = this.hotelDetails?.country?.name;

    const paxes = this.travelers.controls.map((travelerControl, index) => {
      const traveler = travelerControl.value;

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
      countryName: countryName || '',
      rooms: [
        {
          rateKey: this.rateKey, // Viene del state
          roomName: this.nameRoom, // Viene del state
          boardName: (this.rate as any)?.boardName,
          paxes: paxes,
        },
      ],
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

  goBackToResults(): void {
    // Navegar de vuelta a los resultados de búsqueda
    this.router.navigate(['/home/packages/results']);
  }

  paymentMethodValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      // Si no hay valor o es muy corto, no validar aún
      if (!value || value.length < 6) {
        return null;
      }

      // Si no tenemos acceso al paymentComponent aún, no validar
      if (!this.paymentComponent) {
        return null;
      }

      // Si no se detectó un método de pago válido, marcar error
      if (
        !this.paymentComponent.detectedPaymentMethod &&
        !this.paymentComponent.isValidatingCard
      ) {
        return { invalidPaymentMethod: true };
      }

      return null;
    };
  }
}
