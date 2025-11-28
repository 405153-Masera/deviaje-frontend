import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import {
  BookingReferenceResponse,
  HotelBookingDto,
  PaymentDto,
} from '../../models/bookings';
import { DeviajePriceDetailsComponent } from '../deviaje-price-details/deviaje-price-details.component';
import { HotelService } from '../../../../shared/services/hotel.service';
import { ValidatorsService } from '../../../../shared/services/validators.service';
import {
  UserData,
  UserService,
} from '../../../../shared/services/user.service';

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
  private readonly validatorService = inject(ValidatorsService);
  private readonly userService = inject(UserService);
  calculatedTotalAmount: number = 0;

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
  userErrorMessage = '';

  // Booking flow state
  currentStep = 1;
  totalSteps = 3;
  isLoading = false;
  isVerifying = false;
  showSuccessMessage = false;
  bookingReference: BookingReferenceResponse | null = null;
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

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
    }

    // Si no hay datos persistidos, cargar desde el state del router
    if (!this.isReloadedSession) {
      this.loadBookingData();
    }

    this.initializeBookingFlow();
    this.loadCurrentUser();
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
        this.hotelDetails = state.hotelDetails;
        this.hotel = state.hotel;
        this.nameRoom = state.nameRoom;
        this.rate = state.rate;
        this.rateKey = state.rateKey;
        this.recheck = state.recheck;
        this.searchParams = state.searchParams;
      }

      // Cargar los datos del formulario
      const savedFormData = sessionStorage.getItem(this.FORM_DATA_KEY);
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);

        if (this.searchParams) {
          this.setupTravelersForm();
        }

        // Luego cargar los valores guardados
        setTimeout(() => {
          this.mainForm.patchValue(formData);
        }, 100);
        this.isReloadedSession = true;
      }
    } catch (error) {
      console.error('Error al cargar estado persistido:', error);
      this.clearPersistedState();
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

  // Load data from router state
  loadBookingData(): void {
    const state = window.history.state;

    if (state && state.hotelDetails && state.rate) {
      this.hotelDetails = state.hotelDetails;
      this.hotel = state.hotel;
      this.nameRoom = state.nameRoom || '';
      this.rate = state.rate;
      this.rateKey = state.rateKey || '';
      this.recheck = state.recheck;
      this.searchParams = state.searchParams;

      this.saveBookingState();
      this.setupTravelersForm();
    } else {
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
          this.setupBookingBasedOnRole();
        },
        error: () => {
          this.isLoggedIn = false;
          this.setupBookingBasedOnRole();
        },
      })
    );

    this.subscription.add(
      this.authService.activeRole$.subscribe((role) => {
        this.userRole = role || '';
        this.setupBookingBasedOnRole(); // Actualizar vista cuando cambie el rol
      })
    );
  }

  // Setup booking flow based on user role
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
      this.selectedClientId = this.currentUser.id;
      this.showUserSelection = false;
      this.loadUserDataAndPrefill(this.currentUser.username);
    } else if (this.userRole === 'AGENTE') {
      // Solo AGENTE ve el selector
      this.showUserSelection = true;
      this.isGuestBooking = true;
    }
  }

  private clearTravelersForm(): void {
    this.setupTravelersForm();
    this.errorMessage = '';
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

  // Initialize booking flow
  initializeBookingFlow(): void {
    if (this.recheck) {
      this.verifyRateAvailability();
    } else {
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
              const oldPrice = this.rate?.net || 0;
              const newPrice = parseFloat(newRate.net) || 0;

              if (oldPrice !== newPrice) {
                console.log('Price changed from', oldPrice, 'to', newPrice);
              }
              this.hotel = response.hotel;
              this.rate = response.hotel.rooms[0].rates[0];
              this.setupPaymentAmount();
            }
          }
          this.setupPaymentAmount();
        },
        error: (error) => {
          this.isVerifying = false;
          this.errorMessage =
            error.error?.message ||
            'Error al verificar la tarifa. Intente nuevamente.';
          console.error('Verificacion fallida:', error);
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
          travelerType: ['AD'], // ✅ CAMBIAR a HotelBeds
          roomIndex: [roomIndex],
          ...(travelerIndex === 0
            ? {
                contact: this.fb.group({
                  emailAddress: [
                    '',
                    [
                      Validators.required,
                      Validators.email,
                      Validators.maxLength(80),
                      this.validatorService.emailWithDomain(),
                    ],
                  ],
                  phones: this.fb.array([
                    this.fb.group({
                      deviceType: ['MOBILE'],
                      countryCallingCode: ['', Validators.required],
                      number: ['', [Validators.required]],
                    }),
                  ]),
                }),
              }
            : {}),
        });

        this.validatorService.autoUppercaseControl(
          travelerForm.get('firstName')
        );
        this.validatorService.autoUppercaseControl(
          travelerForm.get('lastName')
        );

        travelers.push(travelerForm);
        travelerIndex++;
      }

      // Niños
      for (let c = 0; c < occupancyData.children; c++) {
        const travelerForm = this.fb.group({
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
          travelerType: ['CH'],
          roomIndex: [roomIndex],
        });

        this.validatorService.autoUppercaseControl(
          travelerForm.get('firstName')
        );

        this.validatorService.autoUppercaseControl(
          travelerForm.get('lastName')
        );

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

    if (occupancyPart) {
      const [rooms, adults, children] = occupancyPart.split('~').map(Number);

      return {
        rooms: rooms || 1,
        adults: adults || 1,
        children: children || 0,
      };
    }

    return { rooms: 1, adults: 1, children: 0 };
  }

  // Prefill user data for logged clients
  prefillUserData(userData: UserData): void {
    if (!userData) return;

    const firstTraveler = this.travelers.at(0) as FormGroup;
    if (firstTraveler) {
      firstTraveler.patchValue({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
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
    }
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
            return;
          }
          try {
            const paymentToken =
              await this.paymentComponent.requestPaymentToken();
            if (!paymentToken) {
              this.errorMessage = 'No se pudo procesar los datos';
              return;
            }
            // Guardar el token en el formulario
            this.mainForm
              .get('payment')
              ?.get('paymentToken')
              ?.setValue(paymentToken);
          } catch (error: any) {
            this.errorMessage = 'No se pudo procesar los datos';
            return;
          }
        }
        this.currentStep++;
        this.saveCurrentStep(); // Guardar el paso actual en
      } else {
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

    const isValid = this.travelers.valid;
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
        'No se pudo procesar los datos de la tarjeta. Regrese al paso anterior.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Preparar los datos de la reserva
    const bookingData: HotelBookingDto = this.prepareHotelBookingData();

    // Preparar los datos del pago
    const paymentData: PaymentDto = this.preparePaymentData(paymentToken);
    const pricesDto = this.priceDetailsComponent?.getPricesDto() || null;

    this.bookingService
      .createHotelBooking(bookingData, paymentData, pricesDto)
      .subscribe({
        next: (bookingReference: BookingReferenceResponse) => {
          this.isLoading = false;
          this.showSuccessMessage = true;
          this.bookingReference = bookingReference;
          this.errorMessage = '';

          this.clearPersistedState();

          setTimeout(() => {
            const reference = bookingReference.bookingReference;
            this.router.navigate([`/bookings/${reference}/details`]);
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
    const countryCallingCode =
      contactInfo.phones?.[0]?.countryCallingCode || '';
    const countryName = this.hotelDetails?.country?.name;

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
        email: emailAddress,
        phone: phoneNumber,
        countryCallingCode: countryCallingCode,
      },
      countryName: countryName || '',
      rooms: [
        {
          rateKey: this.rateKey,
          roomName: this.nameRoom,
          boardName: (this.rate as any)?.boardName,
          paxes: paxes,
          cancellationPolicies: JSON.stringify(this.rate.cancellationPolicies)
        },
      ],
    };
  }

  preparePaymentData(paymentToken: string): PaymentDto {
    const travelerData = this.travelers.at(0).value;
    const paymentData = this.mainForm.get('payment')?.value;
    const detectedPaymentMethod = this.mainForm
      .get('payment')
      ?.get('detectedPaymentMethod')?.value;

    const amount = Math.round(paymentData.amount * 100) / 100;

    return {
      amount: amount,
      currency: 'ARS',
      paymentMethod: detectedPaymentMethod,
      type: 'HOTEL',
      paymentToken: paymentToken,
      installments: 1,
      description: 'Reserva de hotel',
      payer: {
        email: travelerData.contact?.emailAddress || '',
        identification: paymentData.payerDni,
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

    this.calculatedTotalAmount = pricesDto.totalAmount;
    //this.calculatedCurrency = pricesDto.currency;

    this.mainForm
      .get('payment')
      ?.get('amount')
      ?.setValue(pricesDto.totalAmount);
    this.mainForm.get('payment')?.get('currency')?.setValue(pricesDto.currency);
  }

  // En deviaje-hotel-booking.component.ts

  goBackToResults(): void {
    // Navegar de vuelta a los resultados de búsqueda
    this.router.navigate(['/home/hotels/results']);
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
