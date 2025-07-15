// // src/shared/entities/appointment.entity.ts
// import { Entity, Fields, IdEntity, Validators, Relations } from "remult";
// import { MortgageRequest } from "./request.entity";
// import { User } from "./user.entity";

// @Entity("appointment", {
//   allowApiCrud: true,
//   allowApiRead: true,
//   caption: "פגישות"
// })
// export class Appointment extends IdEntity {

//   @Fields.string({
//     validate: [Validators.required.withMessage("מזהה לקוח נדרש")],
//     caption: "מזהה לקוח"
//   })
//   customerId!: string;

//   @Relations.toOne(() => User, {
//     field: "customerId",
//     caption: "לקוח"
//   })
//   customer?: User;

//   @Fields.string({
//     validate: [Validators.required.withMessage("מזהה בקשה נדרש")],
//     caption: "מזהה בקשה"
//   })
//   requestId!: string;

//   @Relations.toOne(() => MortgageRequest, {
//     field: "requestId",
//     caption: "בקשת משכנתה"
//   })
//   request?: MortgageRequest;

//   @Fields.date({
//     // validate: [Validators.required("תאריך הפגישה נדרש")],
//     caption: "תאריך פגישה"
//   })
//   startDate!: Date;

//   @Fields.date({
//     // validate: [Validators.required("שעת סיום הפגישה נדרשת")],
//     caption: "שעת סיום פגישה"
//   })
//   endDate!: Date;

//   @Fields.number({
//     caption: "משך פגישה (דקות)",
//     // defaultValue: () => 90
//   })
//   durationMinutes = 90;

//   @Fields.string({
//     caption: "מזהה פגישה בגוגל קלנדר",
//     allowNull: true
//   })
//   calendarEventId?: string;

//   @Fields.boolean({
//     caption: "האם נשלחה תזכורת"
//   })
//   reminderSent = false;

//   @Fields.date({
//     caption: "תאריך שליחת תזכורת",
//     allowNull: true
//   })
//   reminderSentAt?: Date;

//   @Fields.string({
//     caption: "הערות",
//     allowNull: true
//   })
//   notes?: string;

//   @Fields.boolean({
//     caption: "האם בוצעה פגישה"
//   })
//   completed = false;

//   @Fields.date({
//     caption: "תאריך עדכון סטטוס",
//     allowNull: true
//   })
//   completionDate?: Date;

//   @Fields.string({
//     caption: "סיכום פגישה",
//     allowNull: true
//   })
//   summary?: string;

//   @Fields.createdAt({
//     caption: "נוצר בתאריך"
//   })
//   createdAt!: Date;

//   @Fields.updatedAt({
//     caption: "עודכן בתאריך"
//   })
//   updatedAt!: Date;
// }