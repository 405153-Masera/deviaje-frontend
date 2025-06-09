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
  PaymentDto,
  TravelerDto,
} from '../../models/bookings';
import { DeviajeTravelerFormComponent } from '../deviaje-traveler-form/deviaje-traveler-form.component';
import { DeviajePaymentsFormComponent } from '../deviaje-payments-form/deviaje-payments-form.component';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-deviaje-flight-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeviajeTravelerFormComponent,
    DeviajePaymentsFormComponent,
  ],
  templateUrl: './deviaje-flight-booking.component.html',
  styleUrl: './deviaje-flight-booking.component.scss',
})
export class DeviajeFlightBookingComponent implements OnInit, OnDestroy {
  @ViewChild(DeviajePaymentsFormComponent)
  paymentComponent!: DeviajePaymentsFormComponent;

  //Datos para la sessionStorage
  private readonly BOOKING_STATE_KEY = 'flight_booking_state';
  private readonly FORM_DATA_KEY = 'flight_booking_form_data';
  private readonly CURRENT_STEP_KEY = 'flight_booking_current_step';
  private isReloadedSession = false; // Indica si la sesión se recargó. para diferenciar de la primera carga

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  //Servicios para reserva, autenticacion y utilidades
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  readonly flightUtils = inject(FlightUtilsService);

  flightOffer: FlightOfferDto | null = null;
  selectedOffer: FlightOfferDto | null = null;
  searchParams: any;
  currentUser: any = null;

  isLoading = false;
  isVerifying = false;
  currentStep = 1;
  totalSteps = 3;
  showSuccessMessage = false;
  bookingReference = '';
  errorMessage = '';

  mainForm: FormGroup = this.fb.group({
    travelers: this.fb.array([]),
    payment: this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      cardholderName: ['', Validators.required],
      expiryDate: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)],
      ],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      amount: [0, Validators.required],
      currency: ['USD', Validators.required],
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
    //this.authService.currentUser.subscribe(user => {
    //this.currentUser = user;
    //});

    // Verificar y cargar si hay datos persistidos en sessionStorage
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
    }
    // Si no hay datos persistidos, cargar desde el state del router
    if (!this.isReloadedSession) {
      this.loadFromRouterState();
    }

    // Configurar la suscripción para guardar cambios automáticamente
    this.setupFormPersistence();
  }

  ngOnDestroy(): void {
    // Limpiar datos de sessionStorage cuando se destruye el componente
    if (typeof window !== 'undefined') {
      this.clearPersistedState();
    }
  }

  verifyFlightOffer(offer: FlightOfferDto): void {
    this.isVerifying = true;
    this.errorMessage = '';

    this.bookingService.verifyFlightOfferPrice(offer).subscribe({
      next: (verifiedOffer) => {
        this.isVerifying = false;
        if (verifiedOffer) {
          this.selectedOffer = verifiedOffer;
          // Actualizar el precio en el formulario de pago
          this.mainForm
            .get('payment')
            ?.get('amount')
            ?.setValue(parseFloat(verifiedOffer.price.total));
          this.mainForm
            .get('payment')
            ?.get('currency')
            ?.setValue(verifiedOffer.price.currency);

          this.saveBookingState();
        } else {
          this.errorMessage =
            'La oferta de vuelo ya no está disponible. Por favor, realice una nueva búsqueda.';
        }
      },
      error: (error) => {
        this.isVerifying = false;
        this.errorMessage =
          'Error al verificar la disponibilidad: ' +
          (error.message || 'Oferta no disponible');
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
        dateOfBirth: ['', Validators.required],
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

  async submitBooking(): Promise<void> {
    if (!this.selectedOffer) {
      this.errorMessage = 'No hay una oferta de vuelo seleccionada';
      return;
    }

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
      console.log('Token de pago generado:', paymentToken);

      // Preparar los datos de la reserva
      const bookingData: FlightBookingDto = {
        clientId: 1, // Este valor debería venir de la sesión del usuario
        flightOffer: this.selectedOffer,
        travelers: this.prepareTravelersData(),
      };

      // Preparar los datos del pago
      const paymentData: PaymentDto = {
        amount: this.mainForm.get('payment')?.get('amount')?.value,
        currency: this.mainForm.get('payment')?.get('currency')?.value,
        paymentMethod: 'credit_card',
        paymentToken: paymentToken,
        installments: 1,
        description: 'Reserva de vuelo',
        payer: {
          email: this.travelers.at(0)?.get('contact')?.get('emailAddress')
            ?.value,
          identification: this.mainForm.get('payment')?.get('payerDni')?.value,
          identificationType: 'DNI',
        },
      };

      this.bookingService
        .createFlightBooking(bookingData, paymentData)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.showSuccessMessage = true;
              this.bookingReference = response.booking?.id?.toString() || '';
              // Navegar a la página de confirmación o mostrar un mensaje de éxito

              // Limpiar los datos persistidos después del éxito
              this.clearPersistedState();

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

  prepareTravelersData(): TravelerDto[] {
    const travelersData: TravelerDto[] = [];
    const primaryContact = this.travelers.at(0)?.get('contact')?.value;

    this.travelers.controls.forEach((travelerControl, index) => {
      const traveler = travelerControl.value;

      // Solo incluir campos necesarios según el tipo de pasajero
      const travelerData: TravelerDto = {
        id: traveler.id,
        dateOfBirth: traveler.dateOfBirth,
        name: {
          firstName: traveler.firstName,
          lastName: traveler.lastName,
        },
        gender: traveler.gender,
        documents: traveler.documents,
      };

      if (primaryContact) {
        travelerData.contact = {
          emailAddress: primaryContact.emailAddress,
          phones: primaryContact.phones.map((phone: any) => ({
            deviceType: phone.deviceType || 'MOBILE',
            countryCallingCode: phone.countryCallingCode,
            number: phone.number,
          })),
        };
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
        this.currentStep = parseInt(savedStep, 10);
        this.isReloadedSession = true;
      }

      // Cargar los datos del estado de la reserva
      const savedState = sessionStorage.getItem(this.BOOKING_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        this.flightOffer = state.flightOffer;
        this.selectedOffer = state.selectedOffer;
        this.searchParams = state.searchParams;
        this.isReloadedSession = true;
      }

      // Cargar los datos del formulario
      const savedFormData = sessionStorage.getItem(this.FORM_DATA_KEY);
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);

        // Primero inicializar la estructura del formulario
        if (this.searchParams) {
          this.initializeTravelersForm();
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

  private loadFromRouterState(): void {
    let state: any;

    if (typeof window !== 'undefined') {
      state = window.history.state;
    }

    if (state && state.flightOffer) {
      this.flightOffer = state.flightOffer;
      this.selectedOffer = state.flightOffer;
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
        selectedOffer: this.selectedOffer,
        searchParams: this.searchParams,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(this.BOOKING_STATE_KEY, JSON.stringify(state));
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
}
