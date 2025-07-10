// src/app/routes/operator/operator.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { remult } from 'remult';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

// ייבוא הישויות וה-Enums הרלוונטיים
import { Appointment } from '../../../../shared/entity/appointment.entity';
import { MortgageRequestStage } from '../../../../shared/entity/request-stage.entity';
import { MortgageRequest } from '../../../../shared/entity/request.entity';
import { User } from '../../../../shared/entity/user.entity';
import { RequestStatus } from '../../../../shared/enum/request-status.enum';
import { RequestType } from '../../../../shared/enum/request-type.enum';

// ייבוא קומפוננטות דיאלוג/מודאל (צריך ליצור אותן בנפרד)
import { openDialog } from '../../../common-ui-elements';
import { OperatorService } from '../../../service/operator.service';
import { UserService } from '../../../service/user.service';
import { MortgageRequestAssignRequestComponent } from '../../dialog/mortgage-request-assign-request/mortgage-request-assign-request.component';
import { MortgageRequestUpdateStatusComponent, UpdateStatusPayload } from '../../dialog/mortgage-request-update-status/mortgage-request-update-status.component';

@Component({
  selector: 'app-operator',
  templateUrl: './operator.component.html',
  styleUrls: ['./operator.component.scss']
})
export class OperatorComponent implements OnInit {

  // --- נתוני לוח הבקרה והטבלה ---
  requests: (MortgageRequest & { currentStageDetails?: MortgageRequestStage | null })[] = [];
  upcomingAppointments: Appointment[] = [];
  operators: User[] = [];

  // --- מצבי טעינה ---
  loadingRequests = false;
  loadingAppointments = false;
  loadingOperators = false;

  // --- פילוח וחיפוש ---
  filterForm: FormGroup;
  private filterChanged = new BehaviorSubject<void>(undefined);

  // --- פגינציה ---
  totalRequests = 0;
  pageSize = 10;
  currentPage = 1;

  // --- סטטיסטיקות ---
  totalAssignedRequests = 0;
  inProgressRequests = 0;
  completedTodayRequests = 0;
  overdueRequests = 0;

  // --- Enums לשימוש בתבנית ---
  RequestStatus = RequestStatus;
  RequestType = RequestType;
  remult = remult;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private operatorService: OperatorService,
    private userService: UserService
  ) {
    // אתחול טופס הסינון
    this.filterForm = this.fb.group({
      status: [''],
      type: [''],
      fromDate: [''],
      toDate: [''],
      search: ['']
    });

    // הרשמה לשינויים בטופס הסינון כדי לטעון מחדש נתונים
    this.filterForm.valueChanges.pipe(
      startWith(undefined),
      tap(() => this.currentPage = 1),
      switchMap(() => this.loadRequests())
    ).subscribe(
      requests => {
        this.requests = requests;
        this.totalRequests = requests.length;
        this.calculateStats();
      },
      error => {
        console.error('Error loading requests:', error);
        this.loadingRequests = false;
      }
    );
  }
  Math = Math

  ngOnInit(): void {
    this.loadUpcomingAppointments();
    this.loadOperators();
  }

  // --- טעינת נתונים מהשרת ---

  private loadRequests(): Observable<(MortgageRequest & { currentStageDetails?: MortgageRequestStage | null })[]> {
    this.loadingRequests = true;
    const filters = this.filterForm.value;

    return from(this.operatorService.getRequestsWithStages()).pipe(
      tap(() => this.loadingRequests = false),
      map(requests => {
        return requests.filter(request => {
          let match = true;
          if (filters.status && request.status.id !== filters.status.id) {
            match = false;
          }
          if (filters.type && request.requestType.id !== filters.type.id) {
            match = false;
          }
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const customerName = request.customer?.name?.toLowerCase() || '';
            const customerMobile = request.customer?.mobile || '';
            const requestNumber = request.requestNumber?.toString() || '';
            if (!customerName.includes(searchTerm) && !customerMobile.includes(searchTerm) && !requestNumber.includes(searchTerm)) {
              match = false;
            }
          }
          // TODO: הוסף סינון לפי תאריכים
          return match;
        });
      })
    );
  }

  private loadUpcomingAppointments(): void {
    this.loadingAppointments = true;
    // TODO: לשלוף רק פגישות המשויכות לבקשות של המתפעל
    this.upcomingAppointments = [
      { id: '1', customerId: 'cust1', requestId: 'req1', startDate: new Date(new Date().setHours(new Date().getHours() + 2)), endDate: new Date(), durationMinutes: 60, reminderSent: false, completed: false, createdAt: new Date(), updatedAt: new Date() } as Appointment,
      { id: '2', customerId: 'cust2', requestId: 'req2', startDate: new Date(new Date().setDate(new Date().getDate() + 1)), endDate: new Date(), durationMinutes: 90, reminderSent: false, completed: false, createdAt: new Date(), updatedAt: new Date() } as Appointment,
    ];
    this.loadingAppointments = false;
  }

  private loadOperators(): void {
    this.loadingOperators = true;
    from(this.userService.getOperators()).subscribe(
      operators => {
        this.operators = operators;
        this.loadingOperators = false;
      },
      error => {
        console.error('Error loading operators:', error);
        this.loadingOperators = false;
      }
    );
  }

  // --- לוגיקת סטטיסטיקות ---
  private calculateStats(): void {
    this.totalAssignedRequests = this.requests.length;
    this.inProgressRequests = this.requests.filter(r => RequestStatus.isInProgressStatus(r.status)).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.completedTodayRequests = this.requests.filter(r =>
      r.status === RequestStatus.COMPLETED && r.updatedAt.toDateString() === today.toDateString()
    ).length;

    this.overdueRequests = this.requests.filter(r =>
      r.currentStageDetails && r.currentStageDetails.untill && r.currentStageDetails.untill < today && !r.currentStageDetails.done
    ).length;
  }

  // --- פעולות על טבלה / בקשות ---

  onPageChange(page: number): void {
    this.currentPage = page;
    this.filterChanged.next();
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: '', type: '', fromDate: '', toDate: '', search: ''
    });
  }

  viewRequestDetails(request: MortgageRequest): void {
    this.router.navigate(['/request', request.id], { queryParams: { returnUrl: '/operator' } });
  }

  async assignRequest(request: MortgageRequest): Promise<void> {
    const oldOperatorId = request.assignedOperatorId || '';
    const newOperatorId = await openDialog(
      MortgageRequestAssignRequestComponent,
      dlg => dlg.args = { request: request },
      dlg => dlg?.request.assignedOperatorId
    );

    if (newOperatorId && newOperatorId !== oldOperatorId) {
      // קריאה למתודת ה-Backend
      this.operatorService.assignRequestToOperator(request.id, newOperatorId).subscribe(
        async response => {
          // טעינה מחדש של כל הבקשות כדי לרענן את הנתונים והטיפוסים בצורה בטוחה
          this.filterChanged.next(); // זה יפעיל את loadRequests()
        },
        error => {
          console.error('Error updating request status:', error);
        })
    }
  }

  async updateRequestStatus(request: MortgageRequest): Promise<void> {
    const oldStatus = request.status;
    const currentStageId = (request as any).currentStageDetails?.id;

    const response = await openDialog(
      MortgageRequestUpdateStatusComponent,
      dlg => dlg.args = { request: request },
      dlg => dlg?.form.value as UpdateStatusPayload
    );

    if (response && response.status !== oldStatus) {
      try {
        // קריאה למתודת ה-Backend
        this.operatorService.updateRequestStatusAndStage(request.id, response.status, currentStageId).subscribe(
          async response => {
            // טעינה מחדש של כל הבקשות כדי לרענן את הנתונים והטיפוסים בצורה בטוחה
            this.filterChanged.next(); // זה יפעיל את loadRequests()
          },
          error => {
            console.error('Error updating request status:', error);
          })
      } catch (error) {
        console.error('Error updating request status:', error);
        // TODO: הצג הודעת שגיאה למשתמש
      }
    }
  }

  // --- עזרים ל-HTML ---

  getStatusColorClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.NEW: return 'bg-blue-100 text-blue-800 status-new';
      case RequestStatus.WAITING_FOR_DOCUMENTS:
      case RequestStatus.WAITING_FOR_APPOINTMENT:
      case RequestStatus.WAITING_FOR_ADDITIONAL_DOCUMENTS:
      case RequestStatus.WAITING_FOR_CLIENT_RESPONSE:
        return 'bg-yellow-100 text-yellow-800 status-waiting';
      case RequestStatus.APPOINTMENT_SCHEDULED: return 'bg-purple-100 text-purple-800 status-scheduled';
      case RequestStatus.PROCESSING:
      case RequestStatus.ASSIGNED:
        return 'bg-indigo-100 text-indigo-800 status-processing';
      case RequestStatus.WAITING_FOR_APPROVAL: return 'bg-orange-100 text-orange-800 status-approval';
      case RequestStatus.COMPLETED: return 'bg-green-100 text-green-800 status-completed';
      case RequestStatus.REJECTED:
      case RequestStatus.CANCELED:
        return 'bg-red-100 text-red-800 status-rejected';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalRequests / this.pageSize);
    const maxPages = 5;

    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = startPage + maxPages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }
}