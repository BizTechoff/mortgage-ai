// src/app/routes/client/client.component.ts

import { Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { remult } from 'remult';
import { finalize, forkJoin, of, switchMap, tap } from 'rxjs';
import { MortgageRequest } from '../../../../shared/entity/request.entity';
import { User } from '../../../../shared/entity/user.entity';
import { DocumentType, DocumentTypeLabels } from '../../../../shared/enum/document-type.enum';
import { RequestStatus, RequestStatusLabels } from '../../../../shared/enum/request-status.enum';
import { RequestType, RequestTypeLabels } from '../../../../shared/enum/request-type.enum';
import { Roles } from '../../../../shared/enum/roles';
import { AppointmentDetails } from '../../../../shared/type/appointment.type';
import { DocumentItem } from '../../../../shared/type/document.type';
import { UpdateRequestResponse } from '../../../../shared/type/request.type';
import { snpvCustomer } from '../../../../shared/type/snpv.type';
import { SignInController } from '../../../auth/SignInController';
import { BusyService } from '../../../common-ui-elements';
import { weekDays } from '../../../common/dateFunc';
import { UIToolsService } from '../../../common/UIToolsService';
import { AppointmentService } from '../../../service/appointment.service';
import { CalendarService } from '../../../service/callendar.service';
import { DocumentService } from '../../../service/document.service';
import { RequestService } from '../../../service/request.service';
import { SnpvService } from '../../../service/snpv.service';

// Custom currency validator
export function currencyValidator(control: AbstractControl): { [key: string]: any } | null {
  if (!control.value) {
    return null; // Let required validator handle empty values
  }

  const value = control.value.toString().replace(/,/g, '');
  const numValue = Number(value);

  if (isNaN(numValue) || numValue < 0) {
    return { 'invalidCurrency': true };
  }

  return null;
}

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss']
})
export class ClientComponent implements OnInit {
  // Navigation and UI state
  currentRoute = '/dashboard';
  isAuthenticated = false;
  isLoadedOnce = false

  // Web form state
  showWebForm = false;
  requestType = RequestType.none;
  verificationStep = false;
  verificationCode = '';
  mortgageForm: FormGroup;
  currentStep = 1;
  totalSteps = 5;
  formProgress = 0;
  submitted = false;

  // Mobile detection
  isMobile = false;
  mobileValidated = false;

  // File upload state
  uploadProgress: any = {};
  uploadedFiles: any = {};

  // Appointment state
  availableSlots = [] as AppointmentDetails[]
  // [
  //   { date: new Date(2025, 0, 15), time: '10:00' },
  //   { date: new Date(2025, 0, 16), time: '14:00' },
  //   { date: new Date(2025, 0, 17), time: '11:00' },
  //   { date: new Date(2025, 0, 18), time: '15:00' }
  // ];
  selectedAppointment = -1;
  appointmentError = false;
  appointmentDetails: any = null;

  // Success state
  formSubmitSuccess = false;
  requestNumber = 0;

  // Client data
  mobile: string | null = null;
  name: string | null = null;
  customerId = '';
  cameFromWappLink = false

  // Requests data
  requests: MortgageRequest[] = [];
  activeRequest: MortgageRequest | null = null;
  activeRequestId: string | null = null;

  // Documents data
  documents = new Map<string /*DocumentType.id*/, DocumentItem[]>()
  missingDocuments: DocumentType[] = [];

  // Appointments data
  upcomingAppointment: any = null;

  // UI state
  loading = {
    requests: false,
    documents: false,
    appointments: false
  };

  // Enums for the template
  requestStatusLabels = RequestStatusLabels;
  requestTypeLabels = RequestTypeLabels;
  documentTypeLabels = DocumentTypeLabels;
  requestStatuses = Object.values(RequestStatus);
  requestTypes = Object.values(RequestType);
  documentTypes = Object.values(DocumentType);
  RequestService: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ui: UIToolsService,
    private mortgageService: RequestService,
    // private documentService: DocumentService,
    private appointmentService: AppointmentService,
    private fb: FormBuilder,
    private busy: BusyService,
    private documentService: DocumentService,
    private calendarService: CalendarService,
    private snpv: SnpvService
  ) {
    // Initialize mortgage form with currency validators, updated to match HTML
    this.mortgageForm = this.fb.group({
      // Step 1: פרטים אישיים ודמוגרפיים
      fullName: ['', Validators.required],
      mobile: ['', [Validators.required]],
      email: ['', Validators.required], // [cite: 21, 24]
      // idNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      address: ['', Validators.required],
      maritalStatus: ['', Validators.required], // [cite: 21, 25]
      childrenDetails: ['', Validators.required], // [cite: 21, 32]
      husbandAge: ['', Validators.required], // [cite: 21, 49]
      wifeAge: ['', Validators.required], // [cite: 21, 50]

      // Step 2: פרטים פיננסיים ותעסוקתיים
      monthlyIncome: ['', [Validators.required, currencyValidator]], // [cite: 21, 13] (Income for family)
      partnerIncome: ['', [currencyValidator, Validators.required]],
      employmentType: ['', Validators.required], // [cite: 21, 41] (Husband's occupation)
      wifeEmploymentType: ['', Validators.required], // [cite: 21, 45] (Wife's occupation)
      currentBank: ['', Validators.required], // [cite: 21, 54]
      paymentReturns: ['', Validators.required], // [cite: 21, 55]
      healthIssues: [''], // [cite: 21, 59]
      hasLongTermLoans: ['', Validators.required], // [cite: 21, 40]

      // Step 3: פרטי הנכס והלוואה
      propertyCity: ['', Validators.required], // [cite: 1, 4] (for refinance)
      propertyValue: ['', [Validators.required, currencyValidator]], // [cite: 1, 5]
      equityAmount: ['', [currencyValidator, Validators.required]], // [cite: 21, 38] (for new mortgage)
      loanAmount: ['', [Validators.required, currencyValidator]], // No direct match, assumed "כמה תוכלו לשלם בחודש?" [cite: 21, 39] or existing loan amount for refinance [cite: 1, 6]
      loanTerm: ['', Validators.required], // No direct match, inferred from common mortgage forms.
      refinanceReason: ['', Validators.required], // Inferred reason for refinance.
      remainingMortgageBalance: ['', [currencyValidator, Validators.required]], // [cite: 1, 6] (for refinance)
      currentMonthlyMortgagePayment: ['', [currencyValidator, Validators.required]], // [cite: 1, 7] (for refinance)
      hasOtherLoans: ['', Validators.required], // [cite: 1, 8] (for refinance)
      otherLoansAmount: ['', [currencyValidator, Validators.required]], // [cite: 1, 11] (if hasOtherLoans is yes)
      otherLoansMonthlyPayment: ['', [currencyValidator, Validators.required]], // [cite: 1, 12] (if hasOtherLoans is yes)
      numberOfRooms: ['', Validators.required], // [cite: 21, 53] (for new mortgage)
      hasAdditionalProperty: ['', Validators.required], // [cite: 21, 33] (for new mortgage)

      // Step 4 (or 5 for refinance): מטרות וקשיים / בחירת פגישה / העלאת מסמכים
      desiredOutcome: ['', Validators.required], // [cite: 21, 63] (for new mortgage)
      mainDifficulties: ['', Validators.required], // [cite: 21, 64] (for new mortgage)
      paymentDifficultyRating: ['', Validators.required], // [cite: 1, 15] (for refinance, 1-10 scale)
      optimalSituation: ['', Validators.required] // [cite: 1, 17] (for refinance)
    });
  }
  remult = remult;
  RequestType = RequestType;
  RequestStatus = RequestStatus
  DocumentType = DocumentType
  isCustomer = () => remult.isAllowed(Roles.customer);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkIfMobile();
  }

  async ngOnInit() {
    console.log('ClientComponent: ' + this.router.url);
    if (!remult.authenticated()) throw 'NOT AUTH - FROM REMULT ON ClientComponentClientComponent';
    if (!this.isCustomer()) throw 'How u got here?'

    this.route.queryParams.subscribe(async params => {
      this.busy.doWhileShowingBusy(
        async () => {
          // this.mobile = fixPhoneInput(
          //   params['mobile'] as string);

          // var found = false
          // if (this.mobile) {
          //   this.cameFromWappLink = true
          //   var u = await remult.repo(User).findOne({ where: { mobile: this.mobile! } });
          //   if (u) {
          //     this.mobileValidated = !!u.verifyTime;
          //     this.name = u.name;
          //     found = true
          //   }
          // }
          // if (!found) {
          //   const u = await remult.repo(User).findId(remult.user?.id!)
          //   if (u) {
          //     this.mobileValidated = !!u.verifyTime;
          //     this.name = u.name;
          //     this.mobile = u.mobile
          //   }
          // }

          const customer = await remult.repo(User).findId(remult.user?.id!)
          if (customer) {
            this.mobileValidated = !!customer.verifyTime;
            this.name = customer.name;
            this.mobile = customer.mobile
          }

          this.requestType = RequestType.fromString(params['type'] as string);
          console.log(`ClientComponent.ngOnInit: { mobile: '${this.mobile}', requestType: '${this.requestType.id}' }`);
          await this.setVars();
        })
    });
  }

  getHebrewDay = (date: Date) => weekDays[new Date(date).getDay()].caption

  fillAvailableSlots(max = 5) {

    // this.snpv.getCustomers().subscribe(
    //   (customers) => {
    //     console.log('customers', JSON.stringify(customers))
    //   }
    // )

    this.calendarService.getNext7FreeAppointment().subscribe(
      (events) => {
        console.log('events', JSON.stringify(events))
        if (events?.length) {
          this.availableSlots.splice(0)
          this.availableSlots.push(...events)
        }
      },
      (error) => console.error(error)
    )
  }

  async setVars() {
    this.checkIfMobile();
    this.updateFormProgress();
    this.updateTotalSteps();
    this.loadClientRequests();
  }

  /**
   * Load client's mortgage requests
   */
  loadClientRequests(): void {
    this.loading.requests = true;

    this.requests.splice(0)
    RequestService.getRequests().subscribe(
      (requests) => {
        if (requests.length) {
          this.requests.push(...requests);
          const activeRequest = this.requests[0]
          this.setActiveRequest(activeRequest);
        }
        if (!this.activeRequest && this.requestType.id !== RequestType.none.id) {
          // asked from link
          this.createInitialDraft();
        }
      },
      (error) => {
        console.error('Error loading client requests:', error);
        this.loading.requests = false;
        this.isLoadedOnce = true
      });
  }

  // <<< חדש: מתודה ליצירת טיוטה ראשונית
  private createInitialDraft() {
    // וודא ששדות חובה מינימליים קיימים לפני יצירת טיוטה
    // this.mortgageForm.get('fullName')?.markAsTouched();
    // this.mortgageForm.get('mobile')?.markAsTouched();

    // alert(this.mortgageForm.get('fullName')?.value)

    // if (this.mortgageForm.get('fullName')?.invalid || this.mortgageForm.get('mobile')?.invalid) {
    if (!this.name || !this.mobile) {
      console.warn('Cannot create initial draft: Full Name or Mobile is invalid.');
      this.ui.info('יש למלא שם מלא ונייד תקין כדי להתחיל את הבקשה.');
      return;
    }

    const initialData: Partial<MortgageRequest> = {
      // name: this.mortgageForm.get('fullName')?.value,
      // mobile: this.mortgageForm.get('mobile')?.value,
      requestType: this.requestType,
      customerId: remult.user?.id!, // קשר ל-ID של הלקוח המחובר
      status: RequestStatus.QUESTIONNAIRE_IN_PROGRESS // סטטוס התחלתי של טיוטה
    };

    RequestService.create(initialData).subscribe(
      (request) => {
        this.setActiveRequest(request);
        console.log(`Initial draft created with ID: ${this.activeRequestId}`);
        this.ui.info('טיוטה ראשונית נוצרה בהצלחה!');
      },
      (error) => {
        console.error('Error creating initial draft:', error);
        this.ui.error('שגיאה ביצירת טיוטה ראשונית. נסה שוב מאוחר יותר.');
      });
  }


  async openExistingRequest(request: MortgageRequest) {
    console.log('openExistingRequest')
    if (!this.availableSlots.length) {
      this.fillAvailableSlots()
    }

    // alert(request?.id)
    this.requestType = request.requestType;
    this.showWebForm = true;
    this.updateTotalSteps();
  }

  openRequestPage(request: MortgageRequest) {
    this.router.navigate(['/request', request.id], {
      queryParams: { returnUrl: '/client' }
    });
  }

  async openNewRequest(type: RequestType) {
    console.log('openNewRequest')


    // this.getAllFields()

    // alert(request?.id)
    this.requestType = type;
    this.createInitialDraft();
    this.showWebForm = true;
    this.updateTotalSteps();

    // if (!this.mortgageForm.get('fullName')) {
    //   this.mortgageForm.get('fullName')?.setValue(request ? request.personalDetails?.fullName : this.name, { emitEvent: false });
    // }
    // if (!this.mortgageForm.get('mobile')) {
    //   this.mortgageForm.get('mobile')?.setValue(request ? request.personalDetails?.mobile : this.mobile, { emitEvent: false });
    // }
  }


  /**
   * Set active request and load its related data
   * THIS METHOD IS UPDATED TO LOAD ALL FIELDS FROM NESTED OBJECTS IN THE ENTITY
   */
  setActiveRequest(request: MortgageRequest): void {
    this.activeRequest = request;
    this.activeRequestId = request.id;

    // Ensure nested objects exist for safe access
    const applicantInfo = request.personalDetails || {}; // New category name
    const demographic = request.demographicDetails || {}; //
    const keyFinancials = request.keyFinancials || {}; //
    const employmentFinancials = request.employmentAndOtherFinancials || {}; //
    const property = request.propertyData || {}; //
    const loan = request.loanData || {}; //
    const refinance = request.refinanceDetails || {}; // New category
    const otherLoans = request.otherLoansDetails || {}; // New category
    const goals = request.goalsAndDifficulties || {}; // New category
    const appointment = request.appointmentDetails || { date: undefined!, time: '', location: '', operatorName: '' };
    // const financialHealth = request.financialHealthIndicators || {};


    // Pre-fill the form with existing request data from the nested objects
    this.mortgageForm.patchValue({
      // Step 1: Personal and Demographic details (from applicantPersonalInformation and demographicDetails)
      fullName: applicantInfo.fullName ? applicantInfo.fullName : this.name,
      mobile: applicantInfo.mobile ? applicantInfo.mobile : this.mobile,
      email: applicantInfo.email,
      // idNumber: applicantInfo.idNumber,
      address: applicantInfo.address,
      maritalStatus: demographic.maritalStatus,
      childrenDetails: demographic.childrenDetails,
      husbandAge: demographic.husbandAge,
      wifeAge: demographic.wifeAge,

      // Step 2: Financial and Employment details (from keyFinancials and employmentAndOtherFinancials)
      monthlyIncome: this.formatCurrency(keyFinancials.monthlyIncome),
      partnerIncome: this.formatCurrency(keyFinancials.partnerIncome),
      employmentType: employmentFinancials.employmentType,
      wifeEmploymentType: employmentFinancials.wifeEmploymentType,
      currentBank: keyFinancials.currentBank,
      paymentReturns: employmentFinancials.paymentReturns,
      healthIssues: employmentFinancials.healthIssues,
      hasLongTermLoans: employmentFinancials.hasLongTermLoans,

      // Step 3: Property and Loan details
      propertyCity: property.propertyCity,
      propertyValue: this.formatCurrency(property.propertyValue),
      equityAmount: this.formatCurrency(property.equityAmount),
      loanAmount: this.formatCurrency(loan.loanAmount), // Maps from loan.requestedAmount
      loanTerm: loan.loanTerm, // Maps from loan.loanPeriod
      refinanceReason: refinance.refinanceReason,
      remainingMortgageBalance: this.formatCurrency(refinance.remainingMortgageBalance),
      currentMonthlyMortgagePayment: this.formatCurrency(refinance.currentMonthlyMortgagePayment), // Maps from refinanceDetails.currentMonthlyMortgagePayment
      hasOtherLoans: refinance.hasOtherLoans,
      otherLoansAmount: this.formatCurrency(otherLoans.otherLoansAmount),
      otherLoansMonthlyPayment: this.formatCurrency(otherLoans.otherLoansMonthlyPayment),
      numberOfRooms: property.numberOfRooms,
      hasAdditionalProperty: property.hasAdditionalProperty,

      // Step 4/5: Goals and Difficulties / Optimal Situation (from applicationGoalsAndChallenges and financialHealthIndicators)
      desiredOutcome: goals.desiredOutcome,
      mainDifficulties: goals.mainDifficulties,
      paymentDifficultyRating: goals.paymentDifficultyRating,
      optimalSituation: goals.optimalSituation
    });

    // Update selectedAppointment if an appointment exists
    if (appointment && appointment.date && appointment.time) {
      const selectedSlot = this.availableSlots.findIndex(slot =>
        this.isSameAppointmentSlot(slot, appointment)
      );
      if (selectedSlot !== -1) {
        this.selectedAppointment = selectedSlot;
      }
    }

    this.loadRequestDocuments(request.id);
    this.loadRequestAppointment(request.id);
    this.checkMissingDocuments(request.id);

    // If the request is not yet "customer completed", open the form to continue
    if (RequestStatus.isProccessingStatus(request.status)) {
      this.openExistingRequest(request);
    }

    this.isLoadedOnce = true
  }

  private isSameAppointmentSlot(slot: any, appointment: any): boolean {
    // וודא ששני האובייקטים הם מופעי Date או ניתנים להמרה ל-Date
    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
    const appointmentDate = appointment.date instanceof Date ? appointment.date : new Date(appointment.date);

    return slotDate.getFullYear() === appointmentDate.getFullYear() &&
      slotDate.getMonth() === appointmentDate.getMonth() &&
      slotDate.getDate() === appointmentDate.getDate() &&
      slot.time === appointment.time;
  }


  // /**
  //  * Set active request and load its related data
  //  */
  // setActiveRequest(request: MortgageRequest): void {
  //   this.activeRequest = request;
  //   this.activeRequestId = request.id; // שמור את ה-ID גם כאן
  //   this.loadRequestDocuments(request.id);
  //   this.loadRequestAppointment(request.id);
  //   this.checkMissingDocuments(request.id);
  //   // alert(request.requestType.id)
  //   if (RequestStatus.isProccessingStatus(request.status)) {
  //     this.openNewRequest(request.requestType, request);
  //   }
  // }

  viewActiveRequest() {
    // Implement logic to display the full details of activeRequest
    console.log('Viewing active request:', this.activeRequest);
    // You might navigate to a details page:
    if (this.activeRequest?.id) {
      this.router.navigate(['/request', this.activeRequest.id], {
        queryParams: { returnUrl: '/client' }
      });
      // Or open a modal:
      // this.dialog.open(RequestDetailsModalComponent, { data: this.activeRequest });
    }
  }

  /**
   * Format currency with commas
   */
  formatCurrency(value: any): string {
    if (!value) return '';

    // Remove any existing commas and non-numeric characters except decimal point
    const numericValue = value.toString().replace(/[^0-9.]/g, '');

    // Parse as number
    const num = parseFloat(numericValue);
    if (isNaN(num)) return '';

    // Format with commas
    return num.toLocaleString('en-US');
  }

  /**
   * Handle currency input with formatting
   */
  onCurrencyInput(event: any, fieldName: string): void {
    const input = event.target;
    let value = input.value;

    // Remove all non-numeric characters except decimal point
    value = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Format with commas
    const formattedValue = this.formatCurrency(value);

    // Update the input field
    input.value = formattedValue;

    // Update the form control with the raw numeric value
    const numericValue = value.replace(/,/g, '');
    this.mortgageForm.get(fieldName)?.setValue(formattedValue, { emitEvent: false });

    // Store raw value for validation and submission
    this.mortgageForm.get(fieldName)?.updateValueAndValidity();
  }

  /**
   * Get raw numeric value from formatted currency
   */
  private getRawCurrencyValue(formattedValue: string): number {
    if (!formattedValue) return 0;
    const numericValue = formattedValue.toString().replace(/,/g, '');
    return parseFloat(numericValue) || 0;
  }

  /**
   * Check if device is mobile
   */
  private checkIfMobile(): void {
    this.isMobile = window.innerWidth <= 768;

    // If mobile and form is open, ensure proper scrolling
    if (this.isMobile && this.showWebForm) {
      this.preventBodyScroll();
    }
  }

  /**
   * Prevent body scroll when modal is open on mobile
   */
  private preventBodyScroll(): void {
    if (this.showWebForm) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }

  /**
   * Update total steps based on request type
   */
  updateTotalSteps(): void {
    // NEW MORTGAGE: 4 steps (Personal → Financial → Property → Goals & Appointment)
    // REFINANCE: 5 steps (Personal → Financial → Property → Documents & Goals → Appointment)
    this.totalSteps = 5// this.requestType.id === RequestType.new.id ? 4 : 5;

    console.log(`Updated total steps: ${this.totalSteps} for request type: ${this.requestType}`);
    this.updateFormProgress();


    // this.getAllFields()
  }

  // פונקציית עזר לקבלת הקבצים שהועלו עבור סוג מסוים
  getUploadedDocuments(docType: DocumentType): DocumentItem[] {
    return this.activeRequest?.documents?.filter(doc => doc.type?.id === docType.id) || [];
  }


  /**
   * Load documents for a specific request
   */
  loadRequestDocuments(requestId: string): void {
    this.loading.documents = true;

    this.documents.clear()
    this.documentService.getDocumentsByRequestId(requestId).subscribe(
      (documents) => {
        for (const doc of documents) {
          if (!this.documents.has(doc.type!.id)) {
            this.documents.set(doc.type!.id, [] as DocumentItem[])
          }
          this.documents.get(doc.type!.id)!.push(doc)
        }
        this.loading.documents = false;
      },
      (error) => {
        console.error('Error loading request documents:', error);
        this.loading.documents = false;
      }
    );
  }

  /**
   * Load appointment for a specific request
   */
  loadRequestAppointment(requestId: string): void {
    this.loading.appointments = true;

    this.appointmentService.getAppointmentsByRequestId(requestId).subscribe(
      (appointments) => {
        const now = new Date();
        this.upcomingAppointment = appointments
          .find(a => new Date(a.date) > now);

        this.loading.appointments = false;
      },
      (error) => {
        console.error('Error loading request appointments:', error);
        this.loading.appointments = false;
      }
    );
  }

  /**
   * Check missing documents for a request
   */
  checkMissingDocuments(requestId: string): void {
    // this.documentService.checkMissingDocuments(requestId).subscribe(
    //   (missingDocuments) => {
    //     this.missingDocuments = missingDocuments;
    //   },
    //   (error) => {
    //     console.error('Error checking missing documents:', error);
    //   }
    // );
  }

  /**
   * Update form progress
   */
  updateFormProgress(): void {
    this.formProgress = (this.currentStep / this.totalSteps) * 100;
  }

  /**
   * Go to next step
   */
  nextStep(): void {
    if (!this.activeRequestId) {
      this.ui.info('יש להשלים את השדות הראשונים כדי להתחיל את הבקשה.');
      this.scrollToFirstError();
      return;
    }

    if (this.validateCurrentStep()) {
      this.saveCurrentStepData().then(() => {
        if (this.currentStep < this.totalSteps) {
          ++this.currentStep
          this.updateFormProgress();
          this.scrollToTop();
          console.log(`Moved to step: ${this.currentStep}`);
        }
      }).catch(error => {
        console.error('Error saving step data:', error);
        this.ui.error('שגיאה בשמירת נתוני השלב. נסה שוב.');
      });
    } else {
      this.scrollToFirstError();
    }
  }

  /**
   * Go to previous step
   */
  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateFormProgress();
      this.scrollToTop();
    }
  }

  /**
   * Validate current step
   */
  private validateCurrentStep(): boolean {
    const currentStepFields = this.getCurrentStepFields(this.currentStep);
    let isValid = true;

    // Mark all fields in current step as touched to show errors
    currentStepFields.forEach(fieldName => {
      const field = this.mortgageForm.get(fieldName);
      if (field) {
        field.markAsTouched();
        // Specific validation for optional fields that become required if a parent field has a certain value
        if (fieldName === 'otherLoansAmount' && this.mortgageForm.get('hasOtherLoans')?.value === 'yes' && !field.value) {
          field.setErrors({ 'required': true });
          isValid = false;
        } else if (fieldName === 'otherLoansMonthlyPayment' && this.mortgageForm.get('hasOtherLoans')?.value === 'yes' && !field.value) {
          field.setErrors({ 'required': true });
          isValid = false;
        } else if (field.invalid) {
          isValid = false;
        }
      }
    });

    // Specific validation for appointment selection at the final step
    const isAppointmentStep = this.currentStep === 5;
    if (isAppointmentStep) {
      if (this.selectedAppointment < 0) {
        this.appointmentError = true;
        isValid = false;
      } else {
        this.appointmentError = false;
      }
    }

    return isValid;
  }

  private getAllFields() {
    // this.mortgageForm.controls

    const result = [] as string[]
    for (let step = 1; step <= 5; ++step) {
      const fields = this.getCurrentStepFields(step)
      console.log(`${this.requestType.id}.step.${step}: ${JSON.stringify(fields)}`)
      result.push(...fields)
      // console.log(`getAllFields: ${JSON.stringify(result)}`)
    }
    return result
  }

  /**
   * Get form fields for current step
   */
  private getCurrentStepFields(step = 0): string[] {
    const result = [] as string[]
    switch (step) {
      case 1: // Personal and Demographic
        result.push('fullName', 'mobile', /*'idNumber',*/ 'address')
        if (this.requestType.id === RequestType.new.id) {
          result.push('email', 'maritalStatus', 'childrenDetails', 'husbandAge', 'wifeAge');
        }
        break
      case 2: // Financial and Employment
        result.push('monthlyIncome')
        if (this.requestType.id === RequestType.new.id) {
          result.push('partnerIncome', 'employmentType', 'wifeEmploymentType', 'currentBank', 'paymentReturns', 'healthIssues', 'hasLongTermLoans');
        }
        break
      case 3: // Property and Loan
        result.push('propertyValue', 'loanAmount', 'loanTerm')
        if (this.requestType.id === RequestType.new.id) {
          result.push('equityAmount', 'numberOfRooms', 'hasAdditionalProperty');
        }
        else if (this.requestType.id === RequestType.renew.id) { // Refinance
          result.push('propertyCity', 'refinanceReason', 'remainingMortgageBalance', 'currentMonthlyMortgagePayment', 'hasOtherLoans');
          // Conditional fields for 'hasOtherLoans' will be validated if 'yes'
          if (this.mortgageForm.get('hasOtherLoans')?.value === 'yes') {
            result.push('otherLoansAmount', 'otherLoansMonthlyPayment');
          }
        }
        break
      case 4: // New: Goals & Appointment; Renew: Documents & Goals
        if (this.requestType.id === RequestType.new.id) {
          result.push('desiredOutcome', 'mainDifficulties'); // Appointment is not a form control
        } else if (this.requestType.id === RequestType.renew.id) { // RequestType.renew (Documents & Goals step)
          result.push('paymentDifficultyRating', 'optimalSituation'); // Document upload is not a form control
        }
        break
      case 5: // Renew: Appointment
        // return []; // Appointment handled by selectedAppointment, not form control
        break
      default:
        // return [];
        break
    }
    // console.log('getCurrentStepFields.result: ' + result)
    return result
  }

  /**
   * Scroll to top of form (useful for mobile)
   */
  private scrollToTop(): void {
    if (this.isMobile) {
      const formContainer = document.querySelector('.mortgage-web-form');
      if (formContainer) {
        formContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  // <<< חדש: מתודה לשמירת נתוני השלב הנוכחי
  private async saveCurrentStepData(): Promise<void> {
    console.log('saveCurrentStepData')
    if (!this.activeRequestId) {
      console.error('No active request ID to save data. Cannot save step data.');
      return;
    }

    const currentStepFields =
      this.getAllFields()
    // this.getCurrentStepFields(this.currentStep);
    const partialData: Partial<MortgageRequest> = {};
    // console.table('currentStepFields: ', currentStepFields)
    // console.log('partialData.empty: ', partialData)
    // Collect data for current step only
    currentStepFields.forEach(fieldName => {
      const control = this.mortgageForm.get(fieldName);
      if (control) {
        // Convert currency values to raw numbers before sending
        if (['monthlyIncome', 'partnerIncome', 'propertyValue', 'loanAmount', 'equityAmount', 'remainingMortgageBalance', 'currentMonthlyMortgagePayment', 'otherLoansAmount', 'otherLoansMonthlyPayment'].includes(fieldName)) {
          (partialData as any)[fieldName] = this.getRawCurrencyValue(control.value);
        } else {
          (partialData as any)[fieldName] = control.value;
        }
      }
    });

    // console.log('CLIENT: partialData.filled: ', partialData)
    RequestService.update(this.activeRequestId, partialData).subscribe(
      (response) => {
        if (response.success && response.data) {
          this.setActiveRequest(response.data);
        } else {
          this.ui.yesNoQuestion(JSON.stringify(response.error), false);
        }
      },
      (error) => {
        console.error('Error loading client requests:', error);
        this.ui.error('שגיאה בשמירת נתוני השלב. נסה שוב מאוחר יותר.');
      }
    );
  }

  /**
   * Submit mortgage form (final submission)
   */
  submitForm(): void {
    if (!this.customerId) {
      this.customerId = remult.user?.id!;
    }

    this.submitted = true;

    if (!this.activeRequestId) {
      this.ui.error('לא נמצאה בקשה פעילה לשליחה.');
      return;
    }


    const relevent = this.getAllFields()
    Object.keys(this.mortgageForm.controls).forEach(key => {
      const control = this.mortgageForm.get(key);
      if (relevent.includes(key)) {
        control?.enable()
      }
      else { control?.disable() }
    })


    // Validate all fields of the form for final submission
    if (this.mortgageForm.invalid) {
      this.mortgageForm.markAllAsTouched(); // Mark all fields to show errors
      this.scrollToFirstError();

      // --- הוספת לוגיקה להצגת תיאור השגיאות ---
      let errorMessages: string[] = [];
      Object.keys(this.mortgageForm.controls).forEach(key => {
        const control = this.mortgageForm.get(key);
        if (control && control.invalid && control.touched && control.errors) {
          // הוסף את שם השדה והשגיאות הספציפיות
          let fieldName = key; // שם השדה בטופס
          // ניתן להוסיף כאן לוגיקה לתרגום fieldName לשם ידידותי יותר למשתמש (לדוגמה, "fullName" ל-"שם מלא")
          // console.log(this.mortgageForm.value, JSON.stringify(this.mortgageForm.value))
          for (const errorKey in control.errors) {
            // console.log(errorKey, JSON.stringify(control.errors))
            if (control.errors.hasOwnProperty(errorKey)) {
              switch (errorKey) {
                case 'required':
                  errorMessages.push(`${fieldName}: שדה חובה`);
                  break;
                case 'pattern':
                  errorMessages.push(`${fieldName}: פורמט לא תקין`);
                  break;
                case 'email':
                  errorMessages.push(`${fieldName}: כתובת אימייל לא תקינה`);
                  break;
                case 'invalidCurrency':
                  errorMessages.push(`${fieldName}: סכום לא תקין`);
                  break;
                // הוסף מקרים נוספים עבור סוגי ולידטורים אחרים שיש לך
                default:
                  errorMessages.push(`${fieldName}: שגיאה: ${errorKey}`);
                  break;
              }
            }
          }
        }
      });// הצג את כל הודעות השגיאה המפורטות
      if (errorMessages.length > 0) {
        this.ui.error('אנא מלא את כל השדות הנדרשים בטופס:\n' + errorMessages.join('\n'));
        // console.log(JSON.stringify(this.mortgageForm))
      }
    }

    // Validate all fields of the form for final submission
    if (this.mortgageForm.invalid) {
      this.mortgageForm.markAllAsTouched(); // Mark all fields to show errors
      this.scrollToFirstError();
      this.ui.error('אנא מלא את כל השדות הנדרשים בטופס.');
      return;
    }

    // Validate appointment selection at the final step
    const isAppointmentStep = this.currentStep === 5;
    if (isAppointmentStep && this.selectedAppointment < 0) {
      this.appointmentError = true;
      this.scrollToFirstError();
      this.ui.error('יש לבחור מועד לפגישה.');
      return;
    } else {
      this.appointmentError = false;
    }


    // Gather all form data for final submission
    const formData = this.mortgageForm.value;
    console.log('formData', formData)
    const submitData: Partial<MortgageRequest> = {
      ...formData,
      monthlyIncome: this.getRawCurrencyValue(formData.monthlyIncome),
      partnerIncome: this.getRawCurrencyValue(formData.partnerIncome),
      propertyValue: this.getRawCurrencyValue(formData.propertyValue),
      loanAmount: this.getRawCurrencyValue(formData.loanAmount),
      equityAmount: this.getRawCurrencyValue(formData.equityAmount),
      remainingMortgageBalance: this.getRawCurrencyValue(formData.remainingMortgageBalance),
      currentMonthlyMortgagePayment: this.getRawCurrencyValue(formData.currentMonthlyMortgagePayment),
      otherLoansAmount: this.getRawCurrencyValue(formData.otherLoansAmount),
      otherLoansMonthlyPayment: this.getRawCurrencyValue(formData.otherLoansMonthlyPayment),
      requestType: this.requestType,
      customerId: this.customerId,
      appointmentDetails: (isAppointmentStep && this.selectedAppointment >= 0) ? this.availableSlots[this.selectedAppointment] : undefined
    };

    // Determine the final status based on the request type
    let finalStatus = RequestStatus.APPOINTMENT_SCHEDULED

    // let finalStatus: RequestStatus;
    // if (this.requestType.id === RequestType.new.id) {
    //   finalStatus = RequestStatus.WAITING_FOR_APPOINTMENT; // New Mortgage goes to appointment
    // } else { // RequestType.renew
    //   finalStatus = RequestStatus.WAITING_FOR_DOCUMENTS; // Refinance goes to documents upload
    // }

    RequestService.update(this.activeRequestId, submitData, finalStatus).pipe(
      // שלב 1: ולידציה ראשונית של התשובה. אם נכשל, זרוק שגיאה שתיתפס ב-catchError
      tap((response: UpdateRequestResponse) => {
        if (!response.success || !response.data?.id) {
          throw new Error(response.error?.message || 'שליחת הבקשה נכשלה');
        }
      }),
      // שלב 2: אם השלב הראשון הצליח, עבור לביצוע הפעולות הבאות
      switchMap((response: UpdateRequestResponse) => {
        // בצע את כל הפעולות הסינכרוניות כאן
        console.log('Form submitted successfully and status updated:', response.data!.status.caption);
        this.formSubmitSuccess = true;
        this.requestNumber = response.data!.requestNumber || Math.floor(Math.random() * 100000);
        this.appointmentDetails = (isAppointmentStep && this.selectedAppointment >= 0) ? this.availableSlots[this.selectedAppointment] : null;

        // הכן את מערך הקריאות האסינכרוניות שירוצו במקביל
        const parallelCalls$ = [];

        // הוסף את הקריאה ליומן רק אם יש צורך
        if (this.appointmentDetails?.date) {
          console.log('CLIENT :: Preparing addAppointment :: ' + JSON.stringify(this.appointmentDetails));
          // const addAppointment$ = this.calendarService.addAppointment(this.appointmentDetails).pipe(
          //   tap(() => this.ui.info('אירוע נוסף ליומן בהצלחה'))
          // );
          // parallelCalls$.push(addAppointment$);
        }

        // הכן והוסף את הקריאה להוספת לקוח
        const snpvCust = {
          mobiles: [response.data!.personalDetails?.mobile!],
          names: [response.data!.personalDetails?.fullName!],
          lead: true
        } as snpvCustomer;

        const addCustomer$ = this.snpv.addCustomer(snpvCust).pipe(
          tap(success => success && console.info('נוסף לקוח חדש'))
        );
        parallelCalls$.push(addCustomer$);

        // אם אין קריאות לבצע, החזר Observable ריק. אחרת, השתמש ב-forkJoin
        return parallelCalls$.length > 0 ? forkJoin(parallelCalls$) : of('No parallel calls needed');
      }),
      // שלב 3: יתבצע תמיד בסוף השרשרת (הצלחה או כישלון)
      finalize(() => {
        console.log('All operations finished. Performing UI updates.');
        this.scrollToTop();
        this.loadClientRequests();
      })
    ).subscribe({
      next: () => {
        console.log('✅ Entire process completed successfully.');
      },
      error: err => {
        console.error('Error during the process:', err.message || err);
        this.ui.error(err.message || 'אירעה שגיאה. נסה שוב מאוחר יותר.');
      }
    });

    /*
    RequestService.update(this.activeRequestId, submitData, finalStatus).subscribe(
      (response) => {
        if (response.success && response.data?.id) {
          console.log('Form submitted successfully and status updated:', response.data.status.caption);
          this.formSubmitSuccess = true;
          this.requestNumber = response.data.requestNumber || Math.floor(Math.random() * 100000); // שימוש ב-requestNumber מהתגובה
          this.appointmentDetails = (isAppointmentStep && this.selectedAppointment >= 0) ? this.availableSlots[this.selectedAppointment] : null;

          if (this.appointmentDetails && this.appointmentDetails.date) {
            console.log('CLIENT :: addAppointment :: ' + JSON.stringify(this.appointmentDetails));

            this.calendarService.addAppointment(this.appointmentDetails).subscribe(
              success => this.ui.info('אירוע נוסף ליומן בהצלחה'),
              error => this.ui.info('כישלון בהוספת אירוע ליומן, ' + error)
            )

          }

          const snpvCust = {} as snpvCustomer
          snpvCust.mobiles.push(response.data.personalDetails?.mobile!)
          snpvCust.names.push(response.data.personalDetails?.fullName!)
          snpvCust.lead = true;


          this.snpv.addCustomer(snpvCust).subscribe(
            success => {
              if (success) {
                console.info('נוסף לקוח חדש')
              }
            },
            error => console.error(error)
          )

          this.scrollToTop(); // Scroll to top to show success message
          this.loadClientRequests(); // Refresh requests list in dashboard view
        } else {
          this.ui.yesNoQuestion('שליחת הבקשה נכשלה: ' + (response.error?.message || ''));
        }
      },
      (error: any) => {
        console.error('Error submitting form:', error);
        this.ui.error('שגיאה בשליחת הבקשה. נסה שוב מאוחר יותר.');
      }
    );
    */
  }

  async sendHiMessage() {
    const signer = new SignInController();
    signer.mobile = '0526526063';
    const response = await signer.sendVerificationCode();
    if (response.success) {
      this.ui.info('הצליח');
    } else {
      this.ui.info('נכשל: ' + response.error);
    }
  }

  /**
   * Scroll to first form error (useful for mobile)
   */
  private scrollToFirstError(): void {
    if (this.isMobile) {
      setTimeout(() => {
        const firstError = document.querySelector('.error-message');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }

  /**
   * Handle file selection for document upload
   */
  onFileSelected(event: any, documentType: string): void {

    const files = event.target.files;
    if (!files || !files.length) return;

    // Validate file size (max 10MB)
    for (const f of files) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (f.size > maxSize) {
        alert('הקובץ גדול מדי. הגודל המקסימלי הוא 10MB');
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(f.type)) {
        alert('סוג קובץ לא נתמך. אנא העלה קובץ JPG, PNG או PDF');
        return;
      }
    }

    // Start upload progress simulation
    // this.uploadProgress[documentType] = 0;

    // const interval = setInterval(() => {
    //   this.uploadProgress[documentType] += Math.random() * 20;
    //   if (this.uploadProgress[documentType] >= 100) {
    //     this.uploadProgress[documentType] = 100;
    //     clearInterval(interval);

    //     setTimeout(() => {
    //       this.uploadedFiles[documentType] = file.name;
    //       delete this.uploadProgress[documentType];
    //     }, 500);
    //   }
    // }, 200);

    // In real implementation, upload the file
    if (this.activeRequest) {
      this.uploadDocuments(files, DocumentType.fromString(documentType));
    }
  }

  // 1. הגדרת הפונקציה ליצירת FileList מקובץ/קובצי File
  /**
   * Creates a FileList object from an array of File objects.
   * This is the most reliable way to programmatically generate a FileList.
   *
   * @param files An array of File objects.
   * @returns A FileList object containing the provided files.
   */
  createFileListBox(files: File[]): FileList {
    const dataTransfer = new DataTransfer();
    files.forEach(file => {
      dataTransfer.items.add(file);
    });
    return dataTransfer.files;
  }

  /**
   * Upload document for active request
   */
  uploadDocuments(files: FileList, documentType: DocumentType, description?: string): void {
    if (!this.activeRequest) return;
    // if (!this.activeRequest || !this.customerId) return;

    // const list: FileList = this.createFileListBox([file])

    this.documentService.uploadDocuments(
      this.activeRequest.id,
      files,
      documentType.id
    ).subscribe(
      (success) => {
        if (success) { // HttpEventType.Response
          this.loadRequestDocuments(this.activeRequest!.id);
          this.checkMissingDocuments(this.activeRequest!.id);

          this.ui.info('קובץ הועלה בהצלחה')
        }
        else {
          this.ui.info('העלאת קובץ נכשלה')
        }
      },
      (error) => {
        console.error('Error uploading document:', error);
        this.ui.info('שגיאה בהעלאת קובץ')
      }
    );
  }

  /**
   * Select appointment slot
   */
  selectAppointment(index: number): void {
    this.selectedAppointment = index;
    this.appointmentError = false;

  }

  /**
   * Close form and reset state
   */
  closeForm(): void {
    this.showWebForm = false;
    this.formSubmitSuccess = false;
    this.currentStep = 1;
    this.updateFormProgress();
    this.mortgageForm.reset();
    this.selectedAppointment = -1;
    this.submitted = false;
    this.appointmentError = false;
    this.activeRequestId = null; // נקה את ה-ID של הבקשה הפעילה

    // Reset form validation state
    Object.keys(this.mortgageForm.controls).forEach(key => {
      this.mortgageForm.get(key)?.setErrors(null);
      this.mortgageForm.get(key)?.markAsUntouched(); // גם untouch
      this.mortgageForm.get(key)?.markAsPristine(); // גם pristine
    });

    // Re-enable body scroll
    this.preventBodyScroll();

    this.loadClientRequests(); // רענן את רשימת הבקשות
  }

  /**
   * Open form (override to handle mobile specifics)
   */
  openForm(type: RequestType): void {
    this.requestType = type;
    this.showWebForm = true;
    this.updateTotalSteps();

    // Prevent body scroll on mobile
    if (this.isMobile) {
      this.preventBodyScroll();
    }
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.NEW:
        return 'badge-info';
      case RequestStatus.WAITING_FOR_DOCUMENTS:
      case RequestStatus.WAITING_FOR_APPOINTMENT:
      case RequestStatus.WAITING_FOR_ADDITIONAL_DOCUMENTS:
      case RequestStatus.WAITING_FOR_CLIENT_RESPONSE:
      case RequestStatus.QUESTIONNAIRE_IN_PROGRESS: // הוסף את זה
        return 'badge-warning';
      case RequestStatus.APPOINTMENT_SCHEDULED:
        return 'badge-primary';
      case RequestStatus.APPOINTMENT_COMPLETED:
      case RequestStatus.PROCESSING:
      case RequestStatus.ASSIGNED:
        return 'badge-secondary';
      case RequestStatus.WAITING_FOR_APPROVAL:
        return 'badge-dark';
      case RequestStatus.COMPLETED:
        return 'badge-success';
      case RequestStatus.REJECTED:
      case RequestStatus.CANCELED:
        return 'badge-danger';
      default:
        return 'badge-light';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    if (!date) return '';

    const d = new Date(date);
    return d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get document download URL
   */
  getDocumentUrl(documentId: string): string {
    return '';
    // return this.documentService.getDocumentDownloadUrl(documentId);
  }

  /**
   * Getter for form controls
   */
  get f() {
    return this.mortgageForm.controls;
  }

  /**
   * Handle clicks outside modal on mobile (close form)
   */
  onModalBackdropClick(event: MouseEvent): void {
    if (this.isMobile && event.target === event.currentTarget) {
      this.closeForm();
    }
  }

  /**
   * Check if current step is valid for next button
   */
  isCurrentStepValid(): boolean {
    return this.validateCurrentStep();
  }

  /**
   * Get current step title
   */
  getCurrentStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'פרטים אישיים ודמוגרפיים';
      case 2: return 'פרטים פיננסיים ותעסוקתיים';
      case 3: return 'פרטי הנכס והלוואה';
      case 4: return this.requestType.id === RequestType.new.id ? 'מטרות וקשיים' : 'העלאת מסמכים';
      case 5: return 'בחירת מועד פגישה';
      default: return '';
    }
  }

  /**
   * Check if device supports touch
   */
  get isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

}
