// src/app/routes/admin/admin.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { startWith, switchMap, tap } from 'rxjs/operators';
import { MortgageRequest } from '../../../../shared/entity/request.entity';
import { RequestStatus } from '../../../../shared/enum/request-status.enum';
import { RequestType } from '../../../../shared/enum/request-type.enum';
import { AppointmentWithDetails } from '../../../../shared/type/calendar-event.type';
import { AssignOperatorRequest } from '../../../../shared/type/request.type';
import { openDialog } from '../../../common-ui-elements';
import { UIToolsService } from '../../../common/UIToolsService';
import { CalendarService } from '../../../service/callendar.service';
import { RequestService } from '../../../service/request.service';
import { MortgageRequestAssignRequestComponent } from '../../dialog/mortgage-request-assign-request/mortgage-request-assign-request.component';
import { MortgageRequestUpdateStatusComponent, UpdateStatusPayload } from '../../dialog/mortgage-request-update-status/mortgage-request-update-status.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  // Data sources
  requests = [] as MortgageRequest[];
  upcomingAppointments = [] as AppointmentWithDetails[];

  // Pagination
  total = 0;
  pageSize = 10;
  currentPage = 1;

  // Loading states
  loading = false;
  appointmentsLoading = false;

  // Filter form
  filterForm: FormGroup;

  // Tracking state changes for filters
  private filterChanged = new BehaviorSubject<void>(undefined);

  // Enums for the template
  requestStatuses = RequestStatus.getAllStatuses();
  requestTypes = RequestType.getAllTypes();

  // Computed properties
  get newRequestsCount(): number {
    if (!this.requests) {
      this.requests = [] as MortgageRequest[];
    }
    return this.requests.filter(r => r.status.id === RequestStatus.NEW.id).length;
  }

  constructor(
    private mortgageService: RequestService,
    // private documentService: DocumentService,
    private calendarService: CalendarService,
    private fb: FormBuilder,
    private router: Router,
    private ui: UIToolsService
  ) {
    // Initialize filter form
    this.filterForm = this.fb.group({
      status: [''],
      type: [''],
      fromDate: [''],
      toDate: [''],
      search: ['']
    });

    // Subscribe to form value changes
    this.filterForm.valueChanges.subscribe(() => {
      this.filterChanged.next();
    });
  }
  RequestStatus = RequestStatus


  ngOnInit(): void {
    // Load requests with filters
    this.setupRequestsLoader();

    // Load upcoming appointments
    this.loadUpcomingAppointments();
  }

  /**
   * Set up the requests loader with filter reactivity
   */
  private setupRequestsLoader(): void {



    // Combine page changes and filter changes
    combineLatest([
      this.filterChanged.pipe(startWith(undefined)),
    ]).pipe(
      tap(() => {
        this.loading = true;
      }),
      switchMap(() => this.loadRequests())
    ).subscribe(
      (requests) => {
        // console.log('response',response, JSON.stringify(response))
        // console.log('response.hasNext', response.hasNext)
        // console.log('response.hasPrevious', response.hasPrevious)
        // console.log('response.items', response.items)
        // console.log('response.page', response.page)
        // console.log('response.pageSize', response.pageSize)
        // console.log('response.total', response.total)
        // console.log('response.totalPages', response.totalPages)
        this.requests = requests;//items;
        // console.log('this.requests.length',this.requests?.length)
        this.total = requests.length;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading requests:', error);
        this.loading = false;
      }
    );
  }

  /**
   * Load mortgage requests with current filters and pagination
   */
  private loadRequests(): Observable<MortgageRequest[]> {
    const filters = this.filterForm.value;

    // Prepare filter parameters
    const filterParams: any = {
      page: this.currentPage,
      pageSize: this.pageSize,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
      filter: {}
    };

    // Add status filter if selected
    if (filters.status) {
      filterParams.filter.status = filters.status;
    }

    // Add type filter if selected
    if (filters.type) {
      filterParams.filter.requestType = filters.type;
    }

    // Add date range filters if selected
    if (filters.fromDate) {
      filterParams.filter.createdAtFrom = new Date(filters.fromDate).toISOString();
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      filterParams.filter.createdAtTo = toDate.toISOString();
    }

    // Add search term if provided
    if (filters.search) {
      filterParams.search = filters.search;
    }

    return RequestService.getRequests()
    //filterParams);
  }

  /**
   * Load upcoming appointments
   */
  private loadUpcomingAppointments(): void {
    this.appointmentsLoading = true;

    // this.calendarService.getUpcomingAppointments(5).subscribe(
    //   (appointments: AppointmentWithDetails[]) => {
    //     this.upcomingAppointments = appointments;
    //     this.appointmentsLoading = false;
    //   },
    //   (error) => {
    //     console.error('Error loading appointments:', error);
    //     this.appointmentsLoading = false;
    //   }
    // );


    this.appointmentsLoading = false;
  }

  /**
   * Change the current page
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.filterChanged.next();
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.filterForm.reset({
      status: '',
      type: '',
      fromDate: '',
      toDate: '',
      search: ''
    });
  }

  /**
   * Handle request click - navigate to details view
   */
  viewRequestDetails(request: MortgageRequest): void {
    // console.log(`this.router.navigate(['/admin/requests', request.id]);`)
    // Navigate to request details
    // this.router.navigate(['/admin/requests', request.id]);
    // this.router.navigate(['/request', request.id]);
    this.router.navigate(['/request', request.id], {
      queryParams: { returnUrl: '/admin' }
    });
  }

  /**
   * Assign request to an operator
   */
  async assignRequest(request: MortgageRequest) {

    const oldOperatorId = request.assignedOperatorId || ''
    const newOperatorId = await openDialog(MortgageRequestAssignRequestComponent,
      dlg => dlg.args = { request: request },
      dlg => dlg?.request.assignedOperatorId
    )
// alert(oldOperatorId)
    if (newOperatorId && newOperatorId !== oldOperatorId) {
      // alert(oldOperatorId)
      const req: AssignOperatorRequest = {
        requestId: request.id,
        operatorId: newOperatorId
      }
      RequestService.assignOperator(req).subscribe(
        (updatedRequest) => {
          // Update the request in the list
          const index = this.requests.findIndex(r => r.id === updatedRequest.id);
          if (index !== -1) {
            this.requests[index] = updatedRequest;
          }
        },
        (error) => {
          console.error('Error assigning request:', error);
        }
      );
    }
  }

  async updateRequestFinished(request: MortgageRequest) {
    const yes = await this.ui.yesNoQuestion(`לסגור את הבקשה כהושלמה`)
    if (yes) {
      RequestService.updateStatus(request.id, RequestStatus.COMPLETED).subscribe(
        (response) => {
          if (response.success && response.data) {// Update the request in the list
            const index = this.requests.findIndex(r => r.id === response.data?.id);
            if (index !== -1) {
              this.requests[index] = response.data;
            }
          }
        },
        (error) => {
          console.error('Error updating request status:', error);
        }
      );
    }
  }

  async updateRequestAfterMeeting(request: MortgageRequest) {

    const yes = await this.ui.yesNoQuestion(`עדכון תוצאות הפגישה: 'כן' -ממשיך איתנו 'לא'-נדחה`)
    if (yes) {
      RequestService.updateStatus(request.id, RequestStatus.APPOINTMENT_COMPLETED).subscribe(
        (response) => {
          if (response.success && response.data) {// Update the request in the list
            const index = this.requests.findIndex(r => r.id === response.data?.id);
            if (index !== -1) {
              this.requests[index] = response.data;
            }
          }
        },
        (error) => {
          console.error('Error updating request status:', error);
        }
      );
    }
  }

  /**
   * Update request status
   */
  async selectRequestStatus(request: MortgageRequest) {
    const old = request.status
    const response = await openDialog(MortgageRequestUpdateStatusComponent,
      dlg => dlg.args = { request: request },
      dlg => dlg?.form.value as UpdateStatusPayload
    )

    if (response) {
      if (response.status !== old) {
      console.log(`CLIENT: response.status !== oldStatus`, `${response.status.id} !== ${old.id}`, response.status !== old)
        RequestService.updateStatus(request.id, response.status).subscribe(
          (response) => {
            if (response.success && response.data) {// Update the request in the list
              const index = this.requests.findIndex(r => r.id === response.data?.id);
              if (index !== -1) {
                this.requests[index] = response.data;
              }
            }
          },
          (error) => {
            console.error('Error updating request status:', error);
          }
        );
      }
    }
  }
  

  /**
   * Get color class based on request status
   */
  getStatusColorClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.NEW:
        return 'bg-blue-100 text-blue-800';
      case RequestStatus.WAITING_FOR_DOCUMENTS:
      case RequestStatus.WAITING_FOR_APPOINTMENT:
      case RequestStatus.WAITING_FOR_ADDITIONAL_DOCUMENTS:
      case RequestStatus.WAITING_FOR_CLIENT_RESPONSE:
        return 'bg-yellow-100 text-yellow-800';
      case RequestStatus.APPOINTMENT_SCHEDULED:
        return 'bg-purple-100 text-purple-800';
      case RequestStatus.PROCESSING:
      case RequestStatus.ASSIGNED:
        return 'bg-indigo-100 text-indigo-800';
      case RequestStatus.WAITING_FOR_APPROVAL:
        return 'bg-orange-100 text-orange-800';
      case RequestStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case RequestStatus.REJECTED:
      case RequestStatus.CANCELED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Generate array of page numbers for pagination
   */
  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.total / this.pageSize);
    const maxPages = 5;  // Maximum number of page buttons to show

    if (totalPages <= maxPages) {
      // If total pages are less than or equal to max pages, show all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Calculate start and end page numbers
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = startPage + maxPages - 1;

    // Adjust if end page exceeds total pages
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  // Math reference for use in template
  get Math() {
    return Math;
  }
}