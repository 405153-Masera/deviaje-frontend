import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { HotelResponseDto, HotelSearchRequest, HotelSearchResponse } from '../../../../shared/models/hotels';

@Component({
  selector: 'app-deviaje-hotel-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeviajeHotelBookingSummaryComponent,
  ],
  templateUrl: './deviaje-hotel-booking.component.html',
  styleUrl: './deviaje-hotel-booking.component.scss'
})
export class DeviajeHotelBookingComponent implements OnInit, OnDestroy {
  
  @ViewChild(DeviajePaymentsFormComponent) paymentComponent!: DeviajePaymentsFormComponent;
  
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
  rate: HotelSearchResponse.Rate | null = null;
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
      phone: ['', [Validators.required]]
    }),
    payment: this.fb.group({
      cardNumber: ['', [Validators.required]],
      cardholderName: ['', Validators.required],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      amount: [0, Validators.required],
      currency: ['EUR', Validators.required],
      paymentToken: ['']
    })
  });
  
  ngOnInit(): void {
    this.loadBookingData();
    //this.loadCurrentUser();
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
  // loadCurrentUser(): void {
  //   this.subscription.add(
  //     this.authService.getCurrentUser().subscribe({
  //       next: (user) => {
  //         this.currentUser = user;
  //         this.isLoggedIn = !!user;
  //         this.userRole = user?.role || '';
          
  //         console.log('Current user:', user);
  //         this.setupBookingBasedOnRole();
  //       },
  //       error: (error) => {
  //         console.log('No user logged in');
  //         this.isLoggedIn = false;
  //         this.setupBookingBasedOnRole();
  //       }
  //     })
  //   );
  // }
  
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
    } else if (this.userRole === 'AGENTE' || this.userRole === 'ADMINISTRADOR') {
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
          this.errorMessage = 'La tarifa seleccionada ya no está disponible. Por favor, realice una nueva búsqueda.';
        }
      })
    );
  }
  
  // Setup travelers form
  setupTravelersForm(): void {
    const travelers = this.mainForm.get('travelers') as FormArray;
    travelers.clear();
    
    // Para hoteles, solo necesitamos el pasajero titular
    const travelerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      travelerType: ['ADULT'],
      gender: ['MALE'],
      dateOfBirth: ['']
    });
    
    travelers.push(travelerForm);
  }
  
  // Prefill user data for logged clients
  prefillUserData(): void {
    if (this.currentUser && this.userRole === 'CLIENTE') {
      const travelerForm = this.travelers.at(0) as FormGroup;
      
      travelerForm.patchValue({
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
      });
      
      // Contact info
      this.mainForm.get('contact')?.patchValue({
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || ''
      });
    }
  }
  
  // Setup payment amount
  setupPaymentAmount(): void {
    if (this.rate) {
      const net = (this.rate as any)?.net || 0;
      this.mainForm.get('payment')?.patchValue({
        amount: net,
        currency: this.searchParams?.currency || 'EUR'
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
    this.travelers.controls.forEach(control => {
      control.markAllAsTouched();
    });
    
    // Mark contact as touched
    this.mainForm.get('contact')?.markAllAsTouched();
    
    return this.travelers.valid && this.mainForm.get('contact')?.valid || false;
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
  
  // Submit booking
  // async submitBooking(): Promise<void> {
  //   if (!this.validateCurrentStep()) {
  //     this.errorMessage = 'Complete todos los campos correctamente';
  //     return;
  //   }
    
  //   // Get payment token from component
  //   const paymentToken = this.mainForm.get('payment')?.get('paymentToken')?.value;
  //   if (!paymentToken) {
  //     this.errorMessage = 'Error: Token de pago no disponible. Regrese al paso anterior.';
  //     return;
  //   }
    
  //   this.isLoading = true;
  //   this.errorMessage = '';
    
  //   try {
  //     // Prepare booking request
  //     const bookingRequest = this.prepareBookingRequest(paymentToken);
      
  //     // Submit to backend
  //     const response = await this.bookingService.createHotelBooking(bookingRequest).toPromise();
      
  //     if (response?.success) {
  //       this.bookingReference = response.bookingReference || 'N/A';
  //       this.showSuccessMessage = true;
  //       this.currentStep = 3; // Confirmation step
  //     } else {
  //       this.errorMessage = response?.message || 'Error al procesar la reserva';
  //     }
  //   } catch (error: any) {
  //     console.error('Booking error:', error);
  //     this.errorMessage = error?.error?.message || 'Error al procesar la reserva';
  //   } finally {
  //     this.isLoading = false;
  //   }
  // }
  
  // Prepare booking request for backend
  prepareBookingRequest(paymentToken: string): any {
    const travelerData = this.travelers.at(0).value;
    const contactData = this.mainForm.get('contact')?.value;
    const paymentData = this.mainForm.get('payment')?.value;
    
    // Determine clientId and agentId based on role and selection
    let clientId = null;
    let agentId = null;
    
    if (this.userRole === 'CLIENTE' && !this.isGuestBooking) {
      clientId = this.currentUser.id;
      agentId = null;
    } else if ((this.userRole === 'AGENTE' || this.userRole === 'ADMINISTRADOR')) {
      if (!this.isGuestBooking && this.selectedClientId) {
        clientId = this.selectedClientId;
        agentId = this.currentUser.id;
      } else {
        clientId = null;
        agentId = this.currentUser.id;
      }
    }
    // For guest booking or no login: both remain null
    
    return {
      hotelBooking: {
        rateKey: this.rateKey,
        holder: {
          name: travelerData.firstName,
          surname: travelerData.lastName
        },
        clientId: clientId,
        agentId: agentId,
        contactInfo: {
          email: contactData.email,
          phone: contactData.phone
        }
      },
      payment: {
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: 'mercado_pago',
        paymentToken: paymentToken
      }
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