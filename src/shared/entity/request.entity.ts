// src/shared/entity/request.entity.ts
import { Entity, Field, Fields, IdEntity, Relations, remult, Validators } from "remult";

import { DocumentType } from "../enum/document-type.enum";
import { RequestStatus } from "../enum/request-status.enum";
import { RequestType } from "../enum/request-type.enum";
import { Roles } from "../enum/roles";
import { MortgageRequestStage } from "./request-stage.entity";
import { User } from "./user.entity";
import { DocumentItem } from "../type/document.type";
import { AppointmentDetails } from "../type/appointment.type";

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
    caption: "סוג בקשה",
    validate: [Validators.required("סוג בקשה נדרש")]
  })
  requestType = RequestType.none

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

  @Fields.string({
    caption: "שלב נוכחי",
    sqlExpression: `(select "desc" from stage where id = (select stage from request_stage where request = request.id order by created desc limit 1))`
    // allowNull: true
  })
  currentStageDesc?: string;

  @Relations.toOne(() => MortgageRequestStage, {
    allowNull: true,
    caption: "אובייקט שלב בקשה נוכחי"
  })
  activeMortgageRequestStage?: MortgageRequestStage;


  // --- קטגוריה: פרטים אישיים (Personal Details) - שלב 1 ---
  // (מכסה את השדות הקריטיים מתוך שלב 1 בטופס)
  @Fields.object({
    caption: "פרטים אישיים",
    allowNull: true
  })
  personalDetails?: {
    fullName?: string; //
    mobile?: string; //
    email?: string; //
    // idNumber?: string; //
    address?: string; //
  };

  // --- קטגוריה: מצב משפחתי ודמוגרפי (Demographic Details) - המשך שלב 1 ---
  // (מכסה את השדות המשלימים מתוך שלב 1 בטופס)
  @Fields.object({
    caption: "מצב משפחתי ודמוגרפי",
    allowNull: true
  })
  demographicDetails?: {
    maritalStatus?: string; //
    childrenDetails?: string; //
    husbandAge?: number; //
    wifeAge?: number; //
    // שדה חמישי אם יש, או להשאיר כך
  };

  // --- קטגוריה: פרטים פיננסיים עיקריים (Key Financials) - שלב 2 ---
  // (מכסה את ההכנסות והבנק)
  @Fields.object({
    caption: "פרטים פיננסיים עיקריים",
    allowNull: true
  })
  keyFinancials?: {
    monthlyIncome?: number; //
    partnerIncome?: number; //
    currentBank?: string; //
    // שדה רביעי וחמישי אם יש, או להשאיר כך
  };

  // --- קטגוריה: פרטים תעסוקתיים ופיננסיים משלימים (Employment & Other Financials) - המשך שלב 2 ---
  // (מכסה את שאר השדות מתוך שלב 2 בטופס)
  @Fields.object({
    caption: "תעסוקה ופיננסים משלימים",
    allowNull: true
  })
  employmentAndOtherFinancials?: {
    employmentType?: string; //
    wifeEmploymentType?: string; //
    paymentReturns?: string; //
    healthIssues?: string; //
    hasLongTermLoans?: string; //
  };

  // --- קטגוריה: נתוני נכס (Property Details) - חלק משלב 3 ---
  @Fields.object({
    caption: "נתוני נכס",
    allowNull: true
  })
  propertyData?: {
    propertyCity?: string; //
    propertyValue?: number; //
    numberOfRooms?: number; //
    hasAdditionalProperty?: string; //
    equityAmount?: number; // הון עצמי הוא חלק מפרטי ההלוואה החדשה
    // שדה חמישי אם יש, או להשאיר כך
  };

  // --- קטגוריה: פרטי הלוואה (Loan Details) - חלק משלב 3 ---
  // (שדות בסיסיים של ההלוואה המבוקשת)
  @Fields.object({
    caption: "פרטי הלוואה",
    allowNull: true
  })
  loanData?: {
    loanAmount?: number; //
    loanTerm?: number; //
    // שדה רביעי וחמישי אם יש, או להשאיר כך
  };

  // --- קטגוריה: פרטי מחזור משכנתה (Refinance Details) - חלק משלב 3 (רק למחזור) ---
  // (שדות ספציפיים למחזור)
  @Fields.object({
    caption: "פרטי מחזור משכנתה",
    allowNull: true
  })
  refinanceDetails?: {
    refinanceReason?: string; //
    remainingMortgageBalance?: number; //
    currentMonthlyMortgagePayment?: number; //
    hasOtherLoans?: string; //
    // שדה חמישי אם יש, או להשאיר כך
  };

  // --- קטגוריה: הלוואות נוספות (Other Loans) - המשך שלב 3 (רק למחזור, תלוי hasOtherLoans) ---
  @Fields.object({
    caption: "הלוואות נוספות",
    allowNull: true
  })
  otherLoansDetails?: {
    otherLoansAmount?: number; //
    otherLoansMonthlyPayment?: number; //
    // שדה שלישי עד חמישי אם יש, או להשאיר כך
  };

  // --- קטגוריה: מטרות וקשיים (Goals & Difficulties) - שלב 4/5 ---
  @Fields.object({
    caption: "מטרות וקשיים",
    allowNull: true
  })
  goalsAndDifficulties?: {
    desiredOutcome?: string; //
    mainDifficulties?: string; //
    // שדה שלישי עד חמישי אם יש, או להשאיר כך
    paymentDifficultyRating?: string; //
    optimalSituation?: string; //
  };


  // --- קטגוריות קיימות (ללא הגבלת 5 שדות פנימיים, כי אלו קטגוריות ייעודיות) ---
  @Fields.object({
    caption: "מסמכים מצורפים",
    allowNull: true
  })
  documents?:  DocumentItem[]

  @Fields.object({
    caption: "פרטי פגישה",
    allowNull: true
  })
  appointmentDetails?: AppointmentDetails;

  // --- שדות כלליים/מערכתיים ---
  @Fields.string({
    caption: "מזהה פגישה בגוגל קלנדר",
    allowNull: true
  })
  calendarEventId?: string;

  @Fields.date({
    caption: "תאריך בקשה",
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

  @Fields.string({
    caption: "הערות ראשוניות",
    allowNull: true
  })
  initialNotes?: string;

  @Fields.string({
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