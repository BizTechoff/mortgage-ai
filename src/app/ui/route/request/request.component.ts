// src/app/routes/request/request.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { remult } from 'remult';
import { firstValueFrom } from 'rxjs';

// ייבוא הישויות וה-Enums הרלוונטיים
import { Appointment } from '../../../../shared/entity/appointment.entity';
import { Document } from '../../../../shared/entity/document.entity';
import { MortgageRequestStage } from '../../../../shared/entity/request-stage.entity';
import { MortgageRequest } from '../../../../shared/entity/request.entity';
import { Stage } from '../../../../shared/entity/stage.entity';
import { User } from '../../../../shared/entity/user.entity';
import { DocumentType } from '../../../../shared/enum/document-type.enum';
import { RequestStatus } from '../../../../shared/enum/request-status.enum';
import { Roles } from '../../../../shared/enum/roles';

// ייבוא שירותים בצד הלקוח
import { AppointmentService } from '../../../service/appointment.service';
import { OperatorService } from '../../../service/operator.service';
import { RequestService } from '../../../service/request.service';

// ייבוא קומפוננטות דיאלוג/מודאל
import { RequestType } from '../../../../shared/enum/request-type.enum';
import { UpdateStageProgressPayload } from '../../../../shared/type/request.type';
import { openDialog } from '../../../common-ui-elements';
import { UIToolsService } from '../../../common/UIToolsService';
import { UserService } from '../../../service/user.service';
import { MortgageRequestAssignRequestComponent } from '../../dialog/mortgage-request-assign-request/mortgage-request-assign-request.component';
import { MortgageRequestUpdateStatusComponent, UpdateStatusPayload } from '../../dialog/mortgage-request-update-status/mortgage-request-update-status.component';


@Component({
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.scss']
})
export class RequestComponent implements OnInit {

  requestId: string | null = null;
  request: (MortgageRequest & { currentStageDetails?: MortgageRequestStage | null }) | null = null;
  customer: User | null = null;
  assignedOperator: User | null = null;
  documents: Document[] = [];
  upcomingAppointments: Appointment[] = [];
  operators: User[] = []; // רשימת מפעילים לשיוך/העברה
  stages: Stage[] = []; // מערך לשמירת השלבים הרלוונטיים לסוג הבקשה
  returnUrl: string | null = null;

  loading = true;
  loadingDocuments = false;
  loadingAppointments = false;
  loadingOperators = false;
  loadingStages = false;

  RequestStatus = RequestStatus;
  DocumentType = DocumentType;
  remult = remult;
  Roles = Roles;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private operatorService: OperatorService,
    private appointmentService: AppointmentService,
    private userService: UserService,
    private ui: UIToolsService
  ) { }

  async ngOnInit(): Promise<void> {
    this.requestId = this.route.snapshot.paramMap.get('id');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (this.requestId) {
      await this.loadRequestDetails();
      if (this.isAllowed(Roles.manager) || this.isAllowed(Roles.admin) || this.isAllowed(Roles.operator)) {
        await this.loadOperators();
      }
      if (this.request) {
        await this.loadStages(this.request.requestType);
      }
    } else {
      console.error('Request ID is missing.');
      this.loading = false;
    }
  }

  private async loadRequestDetails(): Promise<void> {
    this.loading = true;
    try {
      const requestRepo = remult.repo(MortgageRequest);
      const fetchedRequest = await requestRepo.findId(this.requestId!, {
        include: {
          customer: true,
          assignedOperator: true
        }
      });
      if (fetchedRequest) {
        this.request = fetchedRequest as (MortgageRequest & { currentStageDetails?: MortgageRequestStage | null });

        // alert(JSON.stringify(fetchedRequest))
        // שליפת פרטי השלב הנוכחי אם הם לא נכללו
        console.log(1,this.request)
        if (!this.request.currentStageDetails && this.request.currentStageDesc) { // אם יש תיאור שלב אבל אין אובייקט שלם
        console.log(2)
          const currentStage = await remult.repo(MortgageRequestStage).findFirst(
            { request: this.request, done: undefined! }, // חפש שלב פעיל (שלא נגמר)
            { orderBy: { started: 'desc' }, include: { stage: true } } // כולל פרטי ה-Stage עצמו
          );
          this.request.currentStageDetails = currentStage;
        }

        this.customer = this.request.customer || null;
        this.assignedOperator = this.request.assignedOperator || null;

        await this.loadRequestDocuments(this.request.id);
        await this.loadRequestAppointments(this.request.id);

      } else {
        console.warn(`Request with ID ${this.requestId} not found.`);
      }
    } catch (error) {
      console.error('Error loading request details:', error);
    } finally {
      this.loading = false;
      this.scrollToCurrentStage();
    }
  }

  private async loadRequestDocuments(requestId: string): Promise<void> {
    this.loadingDocuments = true;
    try {
      this.documents = await remult.repo(Document).find({
        where: { requestId: requestId }
      });
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      this.loadingDocuments = false;
    }
  }

  private async loadRequestAppointments(requestId: string): Promise<void> {
    this.loadingAppointments = true;
    try {
      this.upcomingAppointments = await firstValueFrom(this.appointmentService.getAppointmentsByRequestId(requestId));
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      this.loadingAppointments = false;
    }
  }

  private async loadOperators(): Promise<void> {
    this.loadingOperators = true;
    try {
      this.operators = await firstValueFrom(this.userService.getOperators());
    } catch (error) {
      console.error('Error loading operators for assignment:', error);
    } finally {
      this.loadingOperators = false;
    }
  }

  private async loadStages(requestType: RequestType): Promise<void> {
    this.loadingStages = true;
    try {
      this.stages = await remult.repo(Stage).find({
        where: { requestType },
        orderBy: { seq: "asc" }
      });
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      this.loadingStages = false;
    }
  }


  async saveInternalNotes(): Promise<void> {
    if (!this.request || (!this.isAllowed(this.Roles.operator) && !this.isAllowed(this.Roles.manager) && !this.isAllowed(this.Roles.admin))) {
      return;
    }
    this.loading = true;
    try {
      const requestRepo = remult.repo(MortgageRequest);
      const requestToUpdate = await requestRepo.findId(this.request.id);
      if (requestToUpdate) {
        requestToUpdate.internalNotes = this.request.internalNotes;
        await requestToUpdate.save();
        console.log('Internal notes saved successfully.');
      }
    } catch (error) {
      console.error('Error saving internal notes:', error);
    } finally {
      this.loading = false;
    }
  }


  async updateRequestStatus(): Promise<void> {
    if (!this.request) return;

    const oldStatus = this.request.status;
    const currentStageId = (this.request as any).currentStageDetails?.id;

    const response = await openDialog(
      MortgageRequestUpdateStatusComponent,
      dlg => dlg.args = { request: this.request! },
      dlg => dlg?.form.value as UpdateStatusPayload
    );

    if (response && response.status !== oldStatus) {
      try {
        await firstValueFrom(this.operatorService.updateRequestStatusAndStage(this.request.id, response.status, currentStageId));
        await this.loadRequestDetails();
      } catch (error) {
        console.error('Error updating request status:', error);
      }
    }
  }

  async startProcessing() {
    if (this.request?.id) {
      RequestService.updateStatus(this.request.id, RequestStatus.PROCESSING).subscribe(
        (response) => {
          if (response.success && response.data) {
            this.request = response.data;
            window?.location?.reload()
          }
        },
        (error) => {
          console.error('Error updating request status:', error);
        }
      );
    }
  }

  async assignRequest(): Promise<void> {
    if (!this.request) return;

    const oldOperatorId = this.request.assignedOperatorId || '';
    const newOperatorId = await openDialog(
      MortgageRequestAssignRequestComponent,
      dlg => dlg.args = { request: this.request! },
      dlg => dlg?.request.assignedOperatorId
    );

    if (newOperatorId && newOperatorId !== oldOperatorId) {
      try {
        await firstValueFrom(this.operatorService.assignRequestToOperator(this.request.id, newOperatorId));
        await this.loadRequestDetails();
      } catch (error) {
        console.error('Error assigning request:', error);
      }
    }
  }

  private scrollToCurrentStage(): void {
    setTimeout(() => {
      const activeStageElement = document.querySelector('.stage-flow .stage-item.active');
      const scrollContainer = document.querySelector('.stage-flow');

      if (activeStageElement && scrollContainer) {
        const elementRect = activeStageElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        const newScrollLeft = elementRect.left - containerRect.left + scrollContainer.scrollLeft;

        activeStageElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });

      } else {
        console.warn('Active stage element or scroll container not found for scrolling.');
      }
    }, 100);
  }

  // --- חדש: מתודה להפעלת דיאלוג עדכון התקדמות שלב ---
  async promptUpdateStageProgress(): Promise<void> {
    if (!this.request || !this.request.currentStageDetails) return;

    const yes = await this.ui.yesNoQuestion('לעדכן התקדמות לשלב הבא?')
    if (!yes) return

    try {
      const updatePayload: UpdateStageProgressPayload = {
        requestId: this.request.id,
        currentStageEntryId: this.request.currentStageDetails.id,
        markStageAsCompleted: true,
        stageNotes: '',
      };

      RequestService.updateStageProgress(updatePayload).subscribe(
        async (request) => {
          await this.loadRequestDetails();
          this.ui.info('התקדמות השלב עודכנה בהצלחה!');
        },
        (errro) => {
          this.ui.error('שגיאה בעדכון התקדמות השלב: ' + (errro?.message || ''));
        }
      )
    } catch (error) {
      console.error('Error updating stage progress:', error);
      this.ui.error('שגיאה בעדכון התקדמות השלב. נסה שוב מאוחר יותר.');
    }
  }

  /**
   * --- חדש: פונקציית עזר עבור ה-HTML לבדיקה אם שלב הושלם לפני השלב הנוכחי הפעיל ---
   * נחוץ לתנאי *ngIf="isStageCompletedBeforeCurrent(currentStageItem)"
   */
  isStageCompletedBeforeCurrent(stageItem: Stage): boolean {
    if (!this.request || !this.request.currentStageDetails?.stage) {
      return false; // אין בקשה או פרטי שלב נוכחי
    }
    // שלב נחשב שהושלם אם הסקווונס שלו קטן מהסקווונס של השלב הפעיל הנוכחי
    return stageItem.seq < (this.request.currentStageDetails.stage.seq || 0);
  }


  downloadDocument(doc: Document): void {
    window.open(doc.viewUrl, '_blank');
  }

  goBack(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  getStatusColorClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.NEW: return 'bg-blue-100 text-blue-800';
      case RequestStatus.WAITING_FOR_DOCUMENTS:
      case RequestStatus.WAITING_FOR_APPOINTMENT:
      case RequestStatus.WAITING_FOR_ADDITIONAL_DOCUMENTS:
      case RequestStatus.WAITING_FOR_CLIENT_RESPONSE:
        return 'bg-yellow-100 text-yellow-800';
      case RequestStatus.APPOINTMENT_SCHEDULED: return 'bg-purple-100 text-purple-800';
      case RequestStatus.PROCESSING:
      case RequestStatus.ASSIGNED:
        return 'bg-indigo-100 text-indigo-800';
      case RequestStatus.WAITING_FOR_APPROVAL: return 'bg-orange-100 text-orange-800';
      case RequestStatus.COMPLETED: return 'bg-green-100 text-green-800';
      case RequestStatus.REJECTED:
      case RequestStatus.CANCELED:
        return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  isAllowed(roleId: string): boolean {
    return remult.isAllowed(roleId);
  }
}