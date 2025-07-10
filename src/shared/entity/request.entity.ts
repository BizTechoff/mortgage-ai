// src/shared/entities/mortgage-request.entity.ts
import { Entity, Field, Fields, IdEntity, Relations, remult, Validators } from "remult";

import { DocumentType } from "../enum/document-type.enum"; // וודא שזה מיובא נכון
import { RequestStatus } from "../enum/request-status.enum";
import { RequestType } from "../enum/request-type.enum";
import { Roles } from "../enum/roles";
import { User } from "./user.entity";

@Entity<MortgageRequest>("request", {
  allowApiCrud: true,
  allowApiRead: true,
  caption: "בקשות",
  backendPrefilter: () =>
    remult.isAllowed([Roles.admin, Roles.manager])
      ? {}
      : remult.isAllowed([Roles.operator])
        ? { assignedOperatorId: remult.user?.id ? remult.user.id! : '-7-5-7-5-' }
        : { customerId: remult.user?.id ? remult.user.id! : '-7-5-7-5-' },
})
export class MortgageRequest extends IdEntity {

  @Fields.string({
    validate: [Validators.required("מזהה לקוח נדרש")],
    caption: "מזהה לקוח"
  })
  customerId!: string;

  @Fields.autoIncrement({ caption: 'מס.בקשה', allowApiUpdate: false, dbReadOnly: true })
  requestNumber = 0;

  @Relations.toOne(() => User, {
    field: "customerId",
    caption: "לקוח",

  })
  customer!: User;

  @Field(() => RequestType, {
    // @Fields.enum(() => RequestType, {
    caption: "סוג בקשה",
    validate: [Validators.required("סוג בקשה נדרש")]
  })
  requestType!: RequestType;

  @Field(() => RequestStatus, {
    caption: "סטטוס"
  })
  status = RequestStatus.NEW;

  @Fields.string({
    caption: "מזהה מפעיל",
    allowNull: true
  })
  assignedOperatorId?: string;

  @Relations.toOne(() => User, {
    field: "assignedOperatorId",
    caption: "מפעיל מטפל",
    includeInApi: true
  })
  assignedOperator?: User;

  @Fields.object({
    caption: "נתוני שאלון",
    allowNull: true
  })
  questionnaireData?: {
    currentQuestionIndex?: number;
    answers: Array<{
      questionId: string;
      questionText: string;
      answerText: string | number | boolean | Date;
      answerType: 'text' | 'number' | 'date' | 'boolean' | 'select';
    }>;
  };

  @Fields.object({
    caption: "נתוני נכס",
    allowNull: true
  })
  propertyData?: {
    address?: string;
    city?: string;
    propertyType?: string;
    propertyValue?: number;
    propertySize?: number;
  };

  @Fields.object({
    caption: "נתוני הלוואה",
    allowNull: true
  })
  loanData?: {
    requestedAmount?: number;
    loanPeriod?: number;
    loanType?: string;
    currentMonthlyPayment?: number;
    desiredMonthlyPayment?: number;
  };

  @Fields.string({
    caption: "מזהה פגישה בגוגל קלנדר",
    allowNull: true
  })
  calendarEventId?: string;

  @Fields.date({
    caption: "תאריך פגישה",
    allowNull: true
  })
  appointmentDate?: Date;

  @Fields.date({
    caption: "תאריך בקשה", // תיקון כותרת
    allowNull: true
  })
  requestDate?: Date;

  @Fields.createdAt({
    caption: "נוצר בתאריך"
  })
  createdAt!: Date;

  @Fields.updatedAt({
    caption: "עודכן בתאריך"
  })
  updatedAt!: Date;

  // הוספת השדות החסרים:

  @Fields.string({
    caption: "הערות ראשוניות", // השדה initialNotes שהיה חסר
    allowNull: true
  })
  initialNotes?: string;

  @Fields.object({
    caption: "מסמכים מצורפים",
    allowNull: true
  })
  documents?: Array<{
    id: string;
    name: string;
    type?: DocumentType; // שימוש ב-DocumentType enum
  }>;

  @Fields.object({
    caption: "פרטי פגישה",
    allowNull: true
  })
  appointmentDetails?: {
    date: Date;
    time: string;
    location?: string;
    operatorName?: string;
  };


  @Fields.string({ // השדה internalNotes המקורי, אם הוא שונה מ-initialNotes
    caption: "הערות פנימיות",
    allowNull: true
  })
  internalNotes?: string;

  @Fields.string({
    caption: "סיבת דחייה",
    allowNull: true
  })
  rejectionReason?: string;

  @Fields.number({
    caption: "סכום סופי מאושר",
    allowNull: true
  })
  approvedAmount?: number;

  @Fields.date({
    caption: "תאריך אישור",
    allowNull: true
  })
  approvalDate?: Date;

  @Fields.string({
    caption: "מורשה אישור",
    allowNull: true
  })
  approvedBy?: string;

}
