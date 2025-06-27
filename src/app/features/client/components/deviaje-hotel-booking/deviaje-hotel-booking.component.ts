import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Components
import { DeviajeHotelBookingSummaryComponent } from '../deviaje-hotel-booking-summary/deviaje-hotel-booking-summary.component';
import { DeviajeTravelerFormComponent } from '../deviaje-traveler-form/deviaje-traveler-form.component';
import { DeviajePaymentsFormComponent } from '../deviaje-payments-form/deviaje-payments-form.component';

// Services
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

// Models
import {
  HotelResponseDto,
  HotelSearchRequest,
  HotelSearchResponse,
} from '../../../../shared/models/hotels';
import { HotelBookingDto, PaymentDto } from '../../models/bookings';
import { DeviajePriceDetailsComponent } from '../deviaje-price-details/deviaje-price-details.component';
import { HotelService } from '../../../../shared/services/hotel.service';

@Component({
  selector: 'app-deviaje-hotel-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeviajeHotelBookingSummaryComponent,
    DeviajeTravelerFormComponent,
    DeviajePaymentsFormComponent,
    DeviajePriceDetailsComponent,
  ],
  templateUrl: './deviaje-hotel-booking.component.html',
  styleUrl: './deviaje-hotel-booking.component.scss',
})
export class DeviajeHotelBookingComponent implements OnInit, OnDestroy {
  @ViewChild(DeviajePaymentsFormComponent)
  paymentComponent!: DeviajePaymentsFormComponent;

  @ViewChild(DeviajePriceDetailsComponent)
  priceDetailsComponent!: DeviajePriceDetailsComponent;

  //Datos para sessionStorage
  private readonly BOOKING_STATE_KEY = 'hotel_booking_state';
  private readonly FORM_DATA_KEY = 'hotel_booking_form_data';
  private readonly CURRENT_STEP_KEY = 'hotel_booking_current_step';
  private isReloadedSession = false;

  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);

  private readonly hotelService = inject(HotelService);
  calculatedTotalAmount: string = '0';

  // Subscription management
  private subscription = new Subscription();

  // Data from router state
  hotelDetails: HotelResponseDto | null = null;
  hotel: HotelSearchResponse.Hotel | null = null;
  nameRoom: string = '';
  rate: HotelSearchResponse.Rate = {} as HotelSearchResponse.Rate;
  rateKey: string = '';
  recheck: boolean = false;
  searchParams: HotelSearchRequest | null = null;

  // User and authentication
  currentUser: any = null;
  isLoggedIn: boolean = false;
  userRole: string = '';

  // Booking flow state
  currentStep = 1;
  totalSteps = 3;
  isLoading = false;
  isVerifying = false;
  showSuccessMessage = false;
  bookingReference = '';
  errorMessage = '';

  // User selection for agents
  showUserSelection = false;
  selectedClientId: string | null = null;
  isGuestBooking = true; // Por defecto reserva como invitado

  // Main form
  mainForm: FormGroup = this.fb.group({
    travelers: this.fb.array([]),
    contact: this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
    }),
    payment: this.fb.group({
      cardNumber: ['', [Validators.required]],
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

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
    }

    // Si no hay datos persistidos, cargar desde el state del router
    if (!this.isReloadedSession) {
      this.loadBookingData();
    }

    this.loadCurrentUser();
    this.initializeBookingFlow();

    this.setupFormPersistence();
  }

  ngOnDestroy(): void {
    // CAMBIAR: Limpiar datos de sessionStorage cuando se destruye el componente
    if (typeof window !== 'undefined') {
      this.clearPersistedState();
    }
    this.subscription.unsubscribe();
    this.isReloadedSession = false;
  }

  // ===== MÉTODOS DE PERSISTENCIA (copiados de flight booking) =====

  private loadPersistedState(): void {
    try {
      // Cargar el paso actual
      const savedStep = sessionStorage.getItem(this.CURRENT_STEP_KEY);
      if (savedStep) {
        this.currentStep = parseInt(savedStep, 10);
        this.isReloadedSession = true;
      }

      // Cargar los datos del estado de la reserva
      const savedState = sessionStorage.getItem(this.BOOKING_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        this.hotelDetails = state.hotelDetails;
        this.hotel = state.hotel;
        this.nameRoom = state.nameRoom;
        this.rate = state.rate;
        this.rateKey = state.rateKey;
        this.recheck = state.recheck;
        this.searchParams = state.searchParams;

        console.log('Hotel booking state restored from sessionStorage');
      }

      // Cargar los datos del formulario
      const savedFormData = sessionStorage.getItem(this.FORM_DATA_KEY);
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);
        this.mainForm.patchValue(formData);
        console.log('Hotel booking form data restored from sessionStorage');
      }
    } catch (error) {
      console.error('Error al cargar estado persistido:', error);
    }
  }

  private saveBookingState(): void {
    try {
      const state = {
        hotelDetails: this.hotelDetails,
        hotel: this.hotel,
        nameRoom: this.nameRoom,
        rate: this.rate,
        rateKey: this.rateKey,
        recheck: this.recheck,
        searchParams: this.searchParams,
      };
      sessionStorage.setItem(this.BOOKING_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error al guardar estado de reserva:', error);
    }
  }

  private setupFormPersistence(): void {
    // Guardar cambios del formulario automáticamente
    this.subscription.add(
      this.mainForm.valueChanges.subscribe(() => {
        this.saveFormData();
      })
    );
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

  // Load data from router state
  loadBookingData(): void {
    const state = window.history.state;

    if (state && state.hotelDetails && state.rate) {
      this.hotelDetails = state.hotelDetails;
      this.hotel = state.hotel;
      this.nameRoom = state.nameRoom || '';
      this.rate = state.rate;
      this.rateKey = state.rateKey || '';
      console.log('Rate key:', this.rateKey);
      this.recheck = state.recheck;
      console.log('Rate:', state.recheck);
      console.log('Recheck status:', this.recheck);
      this.searchParams = state.searchParams;

      console.log('Booking data loaded:', state);
    } else {
      console.error('No booking data found in state');
      this.router.navigate(['/home/hotels/search']);
    }
  }

  // Load current user and determine role
  loadCurrentUser(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoggedIn = !!user;

          console.log('Usuario selecionado:', user);
        },
        error: (error) => {
          console.log('Usuario no logueado');
          this.isLoggedIn = false;
        },
      })
    );

    this.subscription.add(
      this.authService.activeRole$.subscribe((role) => {
        console.log('Active role changed to:', role);
        this.userRole = role || '';
        this.setupBookingBasedOnRole(); // Actualizar vista cuando cambie el rol
      })
    );
  }

  // Setup booking flow based on user role
  setupBookingBasedOnRole(): void {
    console.log('Setting up booking based on role:', this.userRole);
    if (this.userRole === 'ADMINISTRADOR') {
      this.router.navigate(['/home']);
      return;
    }

    console.log('Usuario logueado:', this.isLoggedIn);

    if (!this.isLoggedIn) {
      // Usuario no logueado - reserva como invitado
      this.isGuestBooking = true;
      this.showUserSelection = false;
      this.setupTravelersForm();
    } else if (this.userRole === 'CLIENTE') {
      // Cliente logueado - NO mostrar selector, auto-llenar
      this.isGuestBooking = false;
      this.selectedClientId = this.currentUser.id;
      this.showUserSelection = false; // CLIENTE no ve selector
      this.setupTravelersForm();
      this.prefillUserData();
      this.loadUserDataFromBackend(); // Nuevo método
    } else if (this.userRole === 'AGENTE') {
      // Solo AGENTE ve el selector
      this.showUserSelection = true;
      this.isGuestBooking = true;
      this.setupTravelersForm();
    }

    console.log(
      'Updated flags - showUserSelection:',
      this.showUserSelection,
      'isGuestBooking:',
      this.isGuestBooking
    );
  }

  // Agregar método para cargar datos del backend
  private loadUserDataFromBackend(): void {
    // TODO: Llamar al getUserById del backend para auto-llenar
    console.log('Loading user data for client:', this.currentUser.id);
  }

  // Initialize booking flow
  initializeBookingFlow(): void {
    if (this.recheck) {
      this.verifyRateAvailability();
    } else {
      this.setupTravelersForm();
      this.setupPaymentAmount();
    }
  }

  // Verify rate availability for RECHECK rates
  verifyRateAvailability(): void {
    this.isVerifying = true;
    this.errorMessage = '';

    this.subscription.add(
      this.bookingService.checkRates(this.rateKey).subscribe({
        next: (response) => {
          console.log('Rate verification successful:', response);
          this.isVerifying = false;
          this.setupPaymentAmount();

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
                console.log('Price changed from', oldPrice, 'to', newPrice);

                // Crear nuevo objeto rate con la estructura correcta
                this.rate = {
                  ...this.rate,
                  net: newPrice,
                  rateKey: newRate.rateKey,
                };

                // Actualizar el precio en el formulario
                this.setupPaymentAmount();
              } else {
                console.log('Price confirmed:', newPrice);
              }
            }
          }
          // Continuar con el flujo normal
          this.setupPaymentAmount();
        },
        error: (error) => {
          console.error('Rate verification failed:', error);
          this.isVerifying = false;
          this.errorMessage =
            'La tarifa seleccionada ya no está disponible. Por favor, realice una nueva búsqueda.';
        },
      })
    );
  }

  // Setup travelers form
  setupTravelersForm(): void {
    const travelers = this.mainForm.get('travelers') as FormArray;
    travelers.clear();

    // Extraer ocupación del rateKey: 1~1~1 = 1 habitación, 1 adulto, 1 niño
    const occupancyData = this.extractOccupancyFromRateKey(this.rateKey);

    let travelerIndex = 0;

    // Crear travelers según la ocupación extraída del rateKey
    for (let roomIndex = 0; roomIndex < occupancyData.rooms; roomIndex++) {
      // Adultos
      for (let a = 0; a < occupancyData.adults; a++) {
        const travelerForm = this.fb.group({
          firstName: ['', Validators.required],
          lastName: ['', Validators.required],
          travelerType: ['AD'], // ✅ CAMBIAR a HotelBeds
          roomIndex: [roomIndex],
          ...(travelerIndex === 0
            ? {
                contact: this.fb.group({
                  emailAddress: ['', [Validators.required, Validators.email]],
                  phones: this.fb.array([
                    this.fb.group({
                      deviceType: ['MOBILE'],
                      countryCallingCode: ['+54'],
                      number: ['', [Validators.required]],
                    }),
                  ]),
                }),
              }
            : {}),
        });

        travelers.push(travelerForm);
        travelerIndex++;
      }

      // Niños
      for (let c = 0; c < occupancyData.children; c++) {
        const travelerForm = this.fb.group({
          firstName: ['', Validators.required],
          lastName: ['', Validators.required],
          travelerType: ['CH'], // ✅ CAMBIAR a HotelBeds
          roomIndex: [roomIndex],
        });

        travelers.push(travelerForm);
        travelerIndex++;
      }
    }
  }

  private extractOccupancyFromRateKey(rateKey: string): {
    rooms: number;
    adults: number;
    children: number;
  } {
    //20251015|20251020|W|102|4492|DBT.AS|EB I OP RO|RO||1~1~1|8|P@07...
    //20250722|20250730|W|102|1237|DBL.ST-9|ID_B2B_87|RO|B2BNRFESXX|1~2~1|8|N@07~~21a97~-649799810~N~~~NRF~~1165FB142D3F448175079293030205AAUK0167007600040121a97
    const parts = rateKey.split('|');
    const occupancyPart = parts[9]; // 1~1~1

    console.log('RateKey parts:', parts);
    console.log('Occupancy part:', occupancyPart);

    if (occupancyPart) {
      const [rooms, adults, children] = occupancyPart.split('~').map(Number);

      console.log('adults:', adults, 'children:', children, 'rooms:', rooms);

      return {
        rooms: rooms || 1,
        adults: adults || 1,
        children: children || 0,
      };
    }

    return { rooms: 1, adults: 1, children: 0 };
  }

  // Prefill user data for logged clients
  prefillUserData(): void {
    if (this.currentUser && this.userRole === 'CLIENTE') {
      const travelerForm = this.travelers.at(0) as FormGroup;

      travelerForm.patchValue({
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
      });

      // Contact info in traveler form for hotel mode
      const contactGroup = travelerForm.get('contact') as FormGroup;
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

  get paymentFormGroup(): FormGroup {
    return this.mainForm.get('payment') as FormGroup;
  }

  getTravelerFormGroup(index: number): FormGroup {
    return this.travelers.at(index) as FormGroup;
  }

  // Setup payment amount
  setupPaymentAmount(): void {
    if (this.rate) {
      const net = parseFloat(this.rate.net as any) || 0;
      this.mainForm.get('payment')?.patchValue({
        amount: net,
        currency: this.searchParams?.currency || 'USD',
      });
    }

    //console.log('Payment amount set to:', net, this.searchParams?.currency || 'EUR');

    // Guardar estado actualizado
    this.saveBookingState();
  }

  // Getters for form arrays
  get travelers(): FormArray {
    return this.mainForm.get('travelers') as FormArray;
  }

  // Navigation between steps
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
      this.saveCurrentStep(); // AGREGAR
    }
  }

  // Validation for current step
  validateCurrentStep(): boolean {
    console.log('Validating step:', this.currentStep);
    switch (this.currentStep) {
      case 1: // Travelers and contact
        return this.validateTravelersAndContact();
      case 2: // Payment
        return this.validatePayment();
      default:
        return true;
    }
  }

  validateTravelersAndContact(): boolean {
    console.log('=== VALIDATING TRAVELERS AND CONTACT ===');

    // Mark travelers as touched
    this.travelers.controls.forEach((control, index) => {
      if (control) {
        control.markAllAsTouched();
        console.log(`Traveler ${index} valid:`, control.valid);

        if (control instanceof FormGroup) {
          const errors = this.getFormGroupErrors(control);
          if (errors) {
            console.log(`Traveler ${index} errors:`, errors);
          }
        }
      }
    });

    console.log('Travelers array valid:', this.travelers.valid);
    console.log('Travelers array errors:', this.travelers.errors);

    const isValid = this.travelers.valid;
    console.log('Final validation result:', isValid);

    return isValid;
  }

  // Agregar este método helper para mostrar errores detallados
  private getFormGroupErrors(formGroup: FormGroup): any {
    if (!formGroup) return null;

    let formErrors: any = {};

    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (!control) return;

      const controlErrors = control.errors;
      if (controlErrors) {
        formErrors[key] = controlErrors;
      }

      // Si es un FormGroup anidado, obtener sus errores también
      if (control instanceof FormGroup) {
        const nestedErrors = this.getFormGroupErrors(control);
        if (nestedErrors && Object.keys(nestedErrors).length > 0) {
          formErrors[key + '_nested'] = nestedErrors;
        }
      }
    });

    return Object.keys(formErrors).length > 0 ? formErrors : null;
  }

  validatePayment(): boolean {
    this.mainForm.get('payment')?.markAllAsTouched();
    return this.mainForm.get('payment')?.valid || false;
  }

  // Agent functions - User selection
  onBookingTypeChange(isGuest: boolean): void {
    this.isGuestBooking = isGuest;
    this.selectedClientId = null;

    if (isGuest) {
      // Reset form for guest booking
      this.setupTravelersForm();
    }
  }

  onUserSelected(clientId: string): void {
    this.selectedClientId = clientId;
    this.isGuestBooking = false;
    // TODO: Load user data and prefill form
    console.log('Selected client ID:', clientId);
  }

  async submitBooking(): Promise<void> {
    if (!this.validateCurrentStep()) {
      this.errorMessage = 'Complete todos los campos correctamente';
      return;
    }

    // Get payment token from component
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
      console.log('Token de pago generado:', paymentToken);

      // Preparar los datos de la reserva
      const bookingData: HotelBookingDto = this.prepareHotelBookingData();

      // Preparar los datos del pago
      const paymentData: PaymentDto = this.preparePaymentData(paymentToken);

      const pricesDto = this.priceDetailsComponent?.getPricesDto() || null;

      console.log('Booking data:', bookingData);
      console.log('Payment data:', paymentData);
      console.log('precios:', pricesDto);

      this.bookingService
        .createHotelBooking(bookingData, paymentData, pricesDto)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.showSuccessMessage = true;
              this.bookingReference = response.booking?.id?.toString() || '';
              this.currentStep = 3; // Go to confirmation step

              setTimeout(() => {
                this.router.navigate(['/bookings'], {
                  queryParams: { reference: this.bookingReference },
                });
              }, 3000);
            } else {
              this.errorMessage =
                response.detailedError || 'Error al procesar la reserva';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage =
              'Error al procesar la reserva: ' +
              (error.message || 'Inténtelo nuevamente');
          },
        });
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = error.message || 'Error al procesar el pago';
      console.error('Error en submitBooking:', error);
    }
  }

  // Prepare booking request for backend
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

    // For guest booking or no login: both remain null
    const paxes = this.travelers.controls.map((travelerControl, index) => {
      const traveler = travelerControl.value;
      return {
        roomId: 1, // Asumiendo 1 habitación por ahora
        type: traveler.travelerType, // 'AD' o 'CH'
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
        email: emailAddress, // ✅ AGREGADO
        phone: phoneNumber,   // ✅ AGREGADO
      },
      rooms: [
        {
          rateKey: this.rateKey,
          roomName: this.nameRoom,
          boardName: (this.rate as any)?.boardName,
          paxes: paxes,
        },
      ],
    };
  }

  preparePaymentData(paymentToken: string): PaymentDto {
    const travelerData = this.travelers.at(0).value;
    const paymentData = this.mainForm.get('payment')?.value;

    return {
      amount: this.mainForm.get('payment')?.get('amount')?.value,
      currency: 'ARS',
      paymentMethod: 'master',
      paymentToken: paymentToken,
      installments: 1,
      description: 'Reserva de hotel',
      payer: {
        email: travelerData.contact?.emailAddress || '',
        identification: '', // TODO: Add if needed
        identificationType: 'DNI',
      },
    };
  }

  // Navigate to search
  goToSearch(): void {
    this.router.navigate(['/home/hotels/search']);
  }

  // Navigate to bookings
  goToBookings(): void {
    this.router.navigate(['/bookings']);
  }

  // Método para manejar los precios calculados
  onPricesCalculated(pricesDto: any): void {
    console.log('Precios calculados recibidos:', pricesDto);

    this.calculatedTotalAmount = String(pricesDto.totalAmount);
    //this.calculatedCurrency = pricesDto.currency;

    this.mainForm
      .get('payment')
      ?.get('amount')
      ?.setValue(pricesDto.totalAmount);
    this.mainForm.get('payment')?.get('currency')?.setValue(pricesDto.currency);
  }
}
