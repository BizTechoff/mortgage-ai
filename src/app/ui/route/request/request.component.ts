// src/app/routes/request/request.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { remult } from 'remult';
import { firstValueFrom } from 'rxjs'; //

// ייבוא הישויות וה-Enums הרלוונטיים
import { Appointment } from '../../../../shared/entity/appointment.entity'; //
import { Document } from '../../../../shared/entity/document.entity'; //
import { MortgageRequestStage } from '../../../../shared/entity/request-stage.entity'; //
import { MortgageRequest } from '../../../../shared/entity/request.entity'; //
import { Stage } from '../../../../shared/entity/stage.entity'; //
import { User } from '../../../../shared/entity/user.entity'; //
import { DocumentType } from '../../../../shared/enum/document-type.enum'; //
import { RequestStatus } from '../../../../shared/enum/request-status.enum'; //
import { Roles } from '../../../../shared/enum/roles'; //

// ייבוא שירותים בצד הלקוח
import { AppointmentService } from '../../../service/appointment.service'; //
import { OperatorService } from '../../../service/operator.service'; //
import { RequestService } from '../../../service/request.service'; //

// ייבוא קומפוננטות דיאלוג/מודאל
import { RequestType } from '../../../../shared/enum/request-type.enum';
import { UpdateStageProgressPayload } from '../../../../shared/type/request.type';
import { openDialog } from '../../../common-ui-elements'; //
import { UIToolsService } from '../../../common/UIToolsService';
import { UserService } from '../../../service/user.service';
import { MortgageRequestAssignRequestComponent } from '../../dialog/mortgage-request-assign-request/mortgage-request-assign-request.component'; //
import { MortgageRequestUpdateStatusComponent, UpdateStatusPayload } from '../../dialog/mortgage-request-update-status/mortgage-request-update-status.component'; //


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
  // מצבי טעינה ספציפיים - אם לא בשימוש, אפשר למחוק
  loadingDocuments = false;
  loadingAppointments = false;
  loadingOperators = false;
  loadingStages = false; // מצב טעינה לשלבים

  // Enums לשימוש בתבנית
  RequestStatus = RequestStatus; //
  DocumentType = DocumentType; //
  remult = remult; //
  Roles = Roles; // גישה ל-Roles בתבנית

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
      // טעינת מפעילים ושלבים רק אם המשתמש מורשה לראות/לשייך/לנהל תהליכים
      if (this.isAllowed(Roles.manager) || this.isAllowed(Roles.admin) || this.isAllowed(Roles.operator)) { //
        await this.loadOperators();
      }
      if (this.request) { // טען שלבים רק אם הבקשה נטענה בהצלחה
        await this.loadStages(this.request.requestType); //
      }
    } else {
      console.error('Request ID is missing.');
      // TODO: ניווט לדף שגיאה או הודעה למשתמש
      this.loading = false;
    }
  }

  /**
   * טעינת פרטי הבקשה המלאים
   */
  private async loadRequestDetails(): Promise<void> {
    this.loading = true;
    try {
      const requestRepo = remult.repo(MortgageRequest); //
      const fetchedRequest = await requestRepo.findId(this.requestId!, {
        include: {
          customer: true, //
          assignedOperator: true //
        }
      });
      console.log(1)
      if (fetchedRequest) {
        console.log(2)
        this.request = fetchedRequest as (MortgageRequest & { currentStageDetails?: MortgageRequestStage | null });

        // אם findId לא מביא את currentStageDetails, צריך לשלוף אותו בנפרד
        if (!this.request.currentStageDetails) { //
          console.log(3)
          const currentStage = await remult.repo(MortgageRequestStage).findFirst( //
            { request: this.request, done: undefined! }, //
            { orderBy: { started: 'desc' }, include: { stage: true } } //
          );
          this.request.currentStageDetails = currentStage;
        }

        // alert (this.request.currentStageDetails?.id)

        this.customer = this.request.customer || null;
        this.assignedOperator = this.request.assignedOperator || null;

        await this.loadRequestDocuments(this.request.id);
        await this.loadRequestAppointments(this.request.id);

      } else {
        console.log(4)
        console.warn(`Request with ID ${this.requestId} not found.`);
        // TODO: ניווט לדף 404 או הודעה מתאימה
      }
    } catch (error) {
      console.log(5)
      console.error('Error loading request details:', error);
      // TODO: הצג הודעת שגיאה למשתמש
    } finally {
      this.loading = false;
      this.scrollToCurrentStage()
    }
  }

  /**
   * טעינת מסמכים המשויכים לבקשה
   */
  private async loadRequestDocuments(requestId: string): Promise<void> {
    this.loadingDocuments = true;
    try {
      this.documents = await remult.repo(Document).find({ //
        where: { requestId: requestId } //
      });
      console.log('this.documents.length', this.documents.length)
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      this.loadingDocuments = false;
    }
  }

  /**
   * טעינת פגישות המשויכות לבקשה
   */
  private async loadRequestAppointments(requestId: string): Promise<void> {
    this.loadingAppointments = true;
    try {
      // שימוש ב-firstValueFrom כדי להמיר Observable ל-Promise
      this.upcomingAppointments = await firstValueFrom(this.appointmentService.getAppointmentsByRequestId(requestId)); //
      console.log('this.upcomingAppointments.length', this.upcomingAppointments.length)
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      this.loadingAppointments = false;
    }
  }

  /**
   * טעינת רשימת מפעילים לצורך דיאלוג שיוך
   */
  private async loadOperators(): Promise<void> {
    this.loadingOperators = true;
    try {
      // שימוש ב-firstValueFrom כדי להמיר Observable ל-Promise
      // בהנחה ש-OperatorService.getOperators() מחזיר Observable
      this.operators = await firstValueFrom(this.userService.getOperators()); //
    } catch (error) {
      console.error('Error loading operators for assignment:', error);
    } finally {
      this.loadingOperators = false;
    }
  }

  /**
   * טעינת שלבי התהליך הרלוונטיים לסוג הבקשה
   */
  private async loadStages(requestType: RequestType): Promise<void> {
    this.loadingStages = true;
    try {
      // קריאה ישירה לרפוזיטורי של Remult עבור Stage entity
      this.stages = await remult.repo(Stage).find({ //
        where: { requestType }, // סינון לפי ID של RequestType
        orderBy: { seq: "asc" } // מיון לפי סדר
      });
      console.log('this.stages.length', this.stages.length)
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      this.loadingStages = false;
    }
  }


  /**
   * פעולה: עדכון הערות פנימיות ושמירה ל-Backend
   */
  async saveInternalNotes(): Promise<void> {
    // בדיקת הרשאות באמצעות isAllowed
    if (!this.request || (!this.isAllowed(this.Roles.operator) && !this.isAllowed(this.Roles.manager) && !this.isAllowed(this.Roles.admin))) { //
      return; // רק למורשים
    }
    this.loading = true; // הצג מצב טעינה בזמן שמירה
    try {
      const requestRepo = remult.repo(MortgageRequest); //
      // שלוף את הישות מה-repo לפני שמירה, כדי לוודא שאתה עובד על המופע האחרון והמלא של Remult
      const requestToUpdate = await requestRepo.findId(this.request.id); //
      if (requestToUpdate) {
        requestToUpdate.internalNotes = this.request.internalNotes; //
        await requestToUpdate.save(); // שמירת השינוי
        console.log('Internal notes saved successfully.');
        // TODO: הצג הודעת הצלחה קטנה למשתמש (UI.info)
      }
    } catch (error) {
      console.error('Error saving internal notes:', error);
      // TODO: הצג הודעת שגיאה למשתמש
    } finally {
      this.loading = false;
    }
  }


  /**
   * פעולה: עדכון סטטוס הבקשה
   */
  async updateRequestStatus(): Promise<void> {
    if (!this.request) return;

    const oldStatus = this.request.status; //
    const currentStageId = (this.request as any).currentStageDetails?.id; //

    const response = await openDialog(
      MortgageRequestUpdateStatusComponent,
      dlg => dlg.args = { request: this.request! },
      dlg => dlg?.form.value as UpdateStatusPayload
    );

    if (response && response.status !== oldStatus) { //
      try {
        // קריאה ל-Backend לעדכון סטטוס וקידום שלב
        await firstValueFrom(this.operatorService.updateRequestStatusAndStage(this.request.id, response.status, currentStageId)); //
        await this.loadRequestDetails(); // טעינה מחדש של כל פרטי הבקשה לעדכון התצוגה והשלבים
        // TODO: הצג הודעת הצלחה למשתמש
      } catch (error) {
        console.error('Error updating request status:', error);
        // TODO: הצג הודעת שגיאה למשתמש
      }
    }
  }

  async startProcessing() {
    if (this.request?.id) {
      RequestService.updateStatus(this.request.id, RequestStatus.PROCESSING).subscribe(
        (response) => {
          if (response.success && response.data) {// Update the request in the list
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

  /**
   * פעולה: שיוך/העברת בקשה למפעיל
   */
  async assignRequest(): Promise<void> {
    if (!this.request) return;

    const oldOperatorId = this.request.assignedOperatorId || ''; //
    const newOperatorId = await openDialog(
      MortgageRequestAssignRequestComponent,
      dlg => dlg.args = { request: this.request! }, // העבר רשימת מפעילים לדיאלוג
      dlg => dlg?.request.assignedOperatorId
    );

    if (newOperatorId && newOperatorId !== oldOperatorId) {
      try {
        // קריאה ל-Backend לשיוך מפעיל
        await firstValueFrom(this.operatorService.assignRequestToOperator(this.request.id, newOperatorId)); //
        await this.loadRequestDetails(); // טעינה מחדש של כל פרטי הבקשה לעדכון התצוגה
        // TODO: הצג הודעת הצלחה למשתמש
      } catch (error) {
        console.error('Error assigning request:', error);
        // TODO: הצג הודעת שגיאה למשתמש
      }
    }
  }

  /**
   * Scroll to first form error (useful for mobile)
   */

  private scrollToCurrentStage(): void {
    // אין צורך לבדוק this.request או currentStageDetails כאן
    // כי אנחנו מחפשים אלמנט ספציפי ב-DOM

    setTimeout(() => {
      // 1. נסה למצוא את האלמנט עם המחלקה 'active' בתוך זרימת השלבים
      const activeStageElement = document.querySelector('.stage-flow .stage-item.active');

      // 2. נסה למצוא את הקונטיינר שמבצע את הגלילה
      const scrollContainer = document.querySelector('.stage-flow'); // זהו האלמנט שאתה הגדרת לו overflow-x/y

      if (activeStageElement && scrollContainer) {
        // אם הקונטיינר הגולל הוא 'stage-flow' (כפי שהגדרת ב-CSS)
        // ודא שהוא אכן האלמנט בעל ה-overflow:auto/scroll וה-max-height

        const elementRect = activeStageElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // חשב את מיקום הגלילה החדש:
        // המיקום של האלמנט יחסית לתחילת הקונטיינר הגולל
        const newScrollLeft = elementRect.left - containerRect.left + scrollContainer.scrollLeft;

        // אנחנו רוצים לגלול אופקית (לא אנכית) אם השלבים אופקיים
        // block: 'start' גורם ליישור לתחילת הבלוק האנכי
        // inline: 'start' גורם ליישור לתחילת הבלוק האופקי
        activeStageElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });

        console.log('Scrolled to active stage element:', activeStageElement);
      } else {
        console.warn('Active stage element or scroll container not found for scrolling.');
        // אם לא נמצא, אולי זה אומר שהשלבים עדיין לא נטענו או שהם לא בסטטוס active
      }
    }, 100); // setTimeout כדי לתת לאנגולר לסיים רינדור
  }

  // --- חדש: מתודה להפעלת דיאלוג עדכון התקדמות שלב ---
  async promptUpdateStageProgress(): Promise<void> {
    if (!this.request || !this.request.currentStageDetails) return;

    const yes = await this.ui.yesNoQuestion('לעדכן התקדמות לשלב הבא?')
    if (!yes) return

    // סוג של דיאלוג שיקבל קלט מהמתפעלת:
    // - האם השלב הנוכחי הושלם? (צ'קבוקס)
    // - הערות לשלב זה (שדה טקסט)
    // - אופציונלי: לבחור סטטוס ראשי חדש (לדוגמה, להעביר ל-COMPLETED)
    // const payloadFromDialog = await openDialog(
    // פה תצטרך ליצור קומפוננטת דיאלוג חדשה: StageProgressUpdateDialogComponent
    // שתאפשר למתפעלת להזין את הפרטים.
    // לדוגמה:
    //   {
    //     // קומפוננטת דיאלוג חדשה (צריך ליצור אותה)
    //     // שתחזיר אובייקט עם markAsCompleted: boolean, stageNotes: string, optionalNewStatus?: RequestStatus
    //   } as any, // זמני: עד שתיצור את הדיאלוג
    //   dlg => dlg.args = {
    //     currentStage: this.request!.currentStageDetails!.stage,
    //     requestStatus: this.request!.status // העבר את סטטוס הבקשה הראשי
    //   },
    //   dlg => dlg.result // הדיאלוג צריך להחזיר את ה-payload
    // );

    // if (payloadFromDialog) { // אם הדיאלוג לא בוטל
    try {

      //     requestId: string;
      // currentStageEntryId?: string; // ה-ID של רשומת השלב הנוכחית בטבלת MortgageRequestStage
      // statusToChangeTo?: RequestStatus; // אופציונלי: אם פעולה זו גם משנה סטטוס ראשי (לדוגמה, ל-COMPLETED/REJECTED)
      // stageNotes?: string; // הערות ספציפיות לשלב זה
      // markStageAsCompleted?: boolean; // האם לסמן את השלב הנוכחי כהושלם

      const updatePayload: UpdateStageProgressPayload = {
        requestId: this.request.id,
        currentStageEntryId: this.request.currentStageDetails.id,
        markStageAsCompleted: true,
        stageNotes: '',
        // statusToChangeTo: payloadFromDialog.optionalNewStatus // אם הדיאלוג מאפשר שינוי סטטוס ראשי
      };

      RequestService.updateStageProgress(updatePayload).subscribe(
        async (request) => {
          await this.loadRequestDetails(); // טען מחדש הכל כדי לעדכן UI
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
    // }
  }


  /**
   * פעולה: הורדת מסמך
   */
  downloadDocument(doc: Document): void {
    window.open(doc.viewUrl, '_blank'); //
  }

  /**
   * פעולה: ניווט חזרה לדף הקודם
   */
  goBack(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl); //
    }
    // else {
    //   // ניווט ברירת מחדל אם אין returnUrl (לדוגמה, ללוח בקרה של מנהל/מתפעל)
    //   if (this.isAllowed(Roles.admin)) { //
    //     this.router.navigate(['/admin']);
    //   } else if (this.isAllowed(Roles.operator)) { //
    //     this.router.navigate(['/operator']);
    //   } else {
    //     this.router.navigate(['/']); // דף הבית או לוח בקרה של לקוח
    //   }
    // }
  }

  // --- עזרים ל-HTML ---

  // Get status badge class (כמו באדמין/מתפעל)
  getStatusColorClass(status: RequestStatus): string { //
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

  // בדיקת הרשאות (כמו ב-admin/client) - מקבל Role.id (מחרוזת)
  isAllowed(roleId: string): boolean { //
    return remult.isAllowed(roleId);
  }
}