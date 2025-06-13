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

@Component({
  selector: 'app-deviaje-hotel-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeviajeHotelBookingSummaryComponent,
    DeviajeTravelerFormComponent,
    DeviajePaymentsFormComponent,
  ],
  templateUrl: './deviaje-hotel-booking.component.html',
  styleUrl: './deviaje-hotel-booking.component.scss',
})
export class DeviajeHotelBookingComponent implements OnInit, OnDestroy {
  @ViewChild(DeviajePaymentsFormComponent)
  paymentComponent!: DeviajePaymentsFormComponent;

  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);

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
      currency: ['USD', Validators.required],
      paymentToken: [''],
    }),
  });

  ngOnInit(): void {
    this.loadBookingData();
    this.loadCurrentUser();
    this.initializeBookingFlow();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
      this.recheck = state.recheck || false;
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
          this.userRole = user?.roles?.[0] || '';

          console.log('Usuario sellecionado:', user);
          this.setupBookingBasedOnRole();
        },
        error: (error) => {
          console.log('Usuario no logueado');
          this.isLoggedIn = false;
          this.setupBookingBasedOnRole();
        },
      })
    );
  }

  // Setup booking flow based on user role
  setupBookingBasedOnRole(): void {
    if (!this.isLoggedIn) {
      // Usuario no logueado - reserva como invitado
      this.isGuestBooking = true;
      this.showUserSelection = false;
      this.setupTravelersForm();
    } else if (this.userRole === 'CLIENTE') {
      // Cliente logueado - auto-llenar datos
      this.isGuestBooking = false;
      this.selectedClientId = this.currentUser.id;
      this.showUserSelection = false;
      this.setupTravelersForm();
      this.prefillUserData();
    } else if (
      this.userRole === 'AGENTE' ||
      this.userRole === 'ADMINISTRADOR'
    ) {
      // Agente/Admin - mostrar opciones
      this.showUserSelection = true;
      this.setupTravelersForm();
    }
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
      this.bookingService.checkHotelRate(this.rateKey).subscribe({
        next: (response) => {
          console.log('Rate verification successful:', response);
          this.isVerifying = false;
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
    // Ejemplo: 20251015|20251020|W|102|4492|DBT.AS|EB I OP RO|RO||1~1~1|8|P@07...
    const parts = rateKey.split('|');
    const occupancyPart = parts[10]; // 1~1~1

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
      const net = (this.rate as any)?.net || 0;
      this.mainForm.get('payment')?.patchValue({
        amount: net,
        currency: this.searchParams?.currency || 'EUR',
      });
    }
  }

  // Getters for form arrays
  get travelers(): FormArray {
    return this.mainForm.get('travelers') as FormArray;
  }

  // Navigation between steps
  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Validation for current step
  validateCurrentStep(): boolean {
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
    this.travelers.controls.forEach((control) => {
      control.markAllAsTouched();
    });

    // Mark contact as touched
    this.mainForm.get('contact')?.markAllAsTouched();

    return (
      (this.travelers.valid && this.mainForm.get('contact')?.valid) || false
    );
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

      console.log('Booking data:', bookingData);
      console.log('Payment data:', paymentData);

      this.bookingService
        .createHotelBooking(bookingData, paymentData)
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
    // For guest booking or no login: both remain null

    return {
      clientId: clientId,
      agentId: agentId,
      holder: {
        name: travelerData.firstName,
        surname: travelerData.lastName,
      },
      rooms: [
        {
          rateKey: this.rateKey,
          paxes: [
            {
              roomId: 1,
              type: 'AD', // Adult
              name: travelerData.firstName,
              surname: travelerData.lastName,
            },
          ],
        },
      ],
    };
  }

  preparePaymentData(paymentToken: string): PaymentDto {
    const travelerData = this.travelers.at(0).value;
    const paymentData = this.mainForm.get('payment')?.value;

    return {
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: 'mercado_pago',
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
}
