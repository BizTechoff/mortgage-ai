// src/shared/enums/request-status.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class RequestStatus {
  static NEW = new RequestStatus('NEW', 'חדש');
  static WAITING_FOR_SELECTION = new RequestStatus('WAITING_FOR_SELECTION', 'ממתין לבחירת לקוח');
  static QUESTIONNAIRE_IN_PROGRESS = new RequestStatus('QUESTIONNAIRE_IN_PROGRESS', 'שאלון בתהליך');
  static WAITING_FOR_DOCUMENTS = new RequestStatus('WAITING_FOR_DOCUMENTS', 'ממתין למסמכים');
  static WAITING_FOR_APPOINTMENT = new RequestStatus('WAITING_FOR_APPOINTMENT', 'ממתין לקביעת פגישה');
  static APPOINTMENT_SCHEDULED = new RequestStatus('APPOINTMENT_SCHEDULED', 'פגישה נקבעה');
  static APPOINTMENT_COMPLETED = new RequestStatus('APPOINTMENT_COMPLETED', 'פגישה הושלמה');
  static ASSIGNED = new RequestStatus('ASSIGNED', 'משויך למתפעל');
  static PROCESSING = new RequestStatus('PROCESSING', 'בתהליך עיבוד');
  static WAITING_FOR_ADDITIONAL_DOCUMENTS = new RequestStatus('WAITING_FOR_ADDITIONAL_DOCUMENTS', 'ממתין למסמכים נוספים');
  static WAITING_FOR_CLIENT_RESPONSE = new RequestStatus('WAITING_FOR_CLIENT_RESPONSE', 'ממתין לתשובת לקוח');
  static WAITING_FOR_APPROVAL = new RequestStatus('WAITING_FOR_APPROVAL', 'ממתין לאישור');
  static COMPLETED = new RequestStatus('COMPLETED', 'הושלם');
  static REJECTED = new RequestStatus('REJECTED', 'נדחה');
  static CANCELED = new RequestStatus('CANCELED', 'בוטל');

  constructor(
    public id: string,
    public caption: string
  ) { }

  static getAllStatuses(): RequestStatus[] {
    return Object.values(RequestStatus).filter(status =>
      status instanceof RequestStatus
    ) as RequestStatus[];
  }


  /**
   * Checks if a given status instance represents a "completed" state.
   */
  static isBeloveAssignedStatus(status: RequestStatus): boolean {
    const yes = [
      RequestStatus.NEW,
      RequestStatus.WAITING_FOR_SELECTION,
      RequestStatus.QUESTIONNAIRE_IN_PROGRESS,
      RequestStatus.WAITING_FOR_DOCUMENTS,
      RequestStatus.WAITING_FOR_APPOINTMENT,
      RequestStatus.APPOINTMENT_SCHEDULED,
      RequestStatus.APPOINTMENT_COMPLETED
    ] as RequestStatus[]
    return yes.includes(status);
  }

  /**
   * Checks if a given status instance represents a "completed" state.
   */
  static isProccessingStatus(status: RequestStatus): boolean {
    console.log('isProccessingStatus', status.id)
    const yes = [
      RequestStatus.NEW.id,
      RequestStatus.WAITING_FOR_SELECTION.id,
      RequestStatus.QUESTIONNAIRE_IN_PROGRESS.id,
      RequestStatus.WAITING_FOR_DOCUMENTS.id,
      RequestStatus.WAITING_FOR_APPOINTMENT.id
    ] as string[]
    const result = yes.includes(status.id);
    console.log('result', result)
    return result
  }

  /**
   * Checks if a given status instance represents a "completed" state.
   */
  static isCompletedStatus(status: RequestStatus): boolean {
    return status.id === RequestStatus.COMPLETED.id ||
      status.id === RequestStatus.REJECTED.id || // Often rejected/canceled are considered "completed" from a workflow perspective
      status.id === RequestStatus.CANCELED.id;
  }

  /**
   * Checks if a given status instance represents an "in-progress" (active) state.
   */
  static isInProgressStatus(status: RequestStatus): boolean {
    return !RequestStatus.isCompletedStatus(status) &&
      status !== RequestStatus.NEW; // NEW might be considered not-yet-in-progress, adjust as needed
  }

}


// Export labels object for backwards compatibility
export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))

// 'NEW': 'חדש',
// 'WAITING_FOR_SELECTION': 'ממתין לבחירת לקוח',
// 'QUESTIONNAIRE_IN_PROGRESS': 'שאלון בתהליך',
// 'WAITING_FOR_DOCUMENTS': 'ממתין למסמכים',
// 'WAITING_FOR_APPOINTMENT': 'ממתין לקביעת פגישה',
// 'APPOINTMENT_SCHEDULED': 'פגישה נקבעה',
// 'APPOINTMENT_COMPLETED': 'פגישה הושלמה',
// 'ASSIGNED': 'משויך למתפעל',
// 'PROCESSING': 'בתהליך עיבוד',
// 'WAITING_FOR_ADDITIONAL_DOCUMENTS': 'ממתין למסמכים נוספים',
// 'WAITING_FOR_CLIENT_RESPONSE': 'ממתין לתשובת לקוח',
// 'WAITING_FOR_APPROVAL': 'ממתין לאישור',
// 'COMPLETED': 'הושלם',
// 'REJECTED': 'נדחה',
// 'CANCELED': 'בוטל'