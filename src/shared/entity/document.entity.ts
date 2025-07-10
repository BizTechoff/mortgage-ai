// src/shared/entities/document.entity.ts
import { Entity, Fields, IdEntity, Validators, Relations, Field } from "remult";
import { MortgageRequest } from "./request.entity";
import { DocumentType } from "../enum/document-type.enum";
import { User } from "./user.entity";

@Entity("document", {
  allowApiCrud: true,
  allowApiRead: true,
  caption: "מסמכים"
})
export class Document extends IdEntity {

  @Fields.string({
    validate: [Validators.required("שם קובץ נדרש")],
    caption: "שם קובץ"
  })
  fileName!: string;

  @Fields.string({
    validate: [Validators.required("מזהה לקוח נדרש")],
    caption: "מזהה לקוח"
  })
  customerId!: string;

  @Relations.toOne(() => User, {
    field: "customerId",
    caption: "לקוח"
  })
  customer!: User;

  @Fields.string({
    validate: [Validators.required("מזהה בקשה נדרש")],
    caption: "מזהה בקשה"
  })
  requestId!: string;

  @Relations.toOne(() => MortgageRequest, {
    field: "requestId",
    caption: "בקשת משכנתה"
  })
  request?: MortgageRequest;

  @Field(()=>DocumentType,{
    caption: "סוג מסמך",
    // validate: [Validators.required.withMessage("סוג מסמך נדרש")]
  })
  documentType!: DocumentType;

  @Fields.string({
    caption: "תיאור",
    allowNull: true
  })
  description?: string;

  @Fields.string({
    validate: [Validators.required("נתיב קובץ נדרש")],
    caption: "נתיב קובץ",
    includeInApi: false
  })
  filePath!: string;

  @Fields.string({
    caption: "URL לצפייה",
    includeInApi: true
  })
  viewUrl!: string;

  @Fields.number({
    caption: "גודל קובץ (בייטים)"
  })
  fileSize = 0;

  @Fields.string({
    caption: "סוג MIME"
  })
  mimeType = "";

  @Fields.boolean({
    caption: "מאומת"
  })
  verified = false;

  @Fields.string({
    caption: "הערות אימות",
    allowNull: true
  })
  verificationNotes?: string;

  @Fields.date({
    caption: "תאריך אימות",
    allowNull: true
  })
  verificationDate?: Date;

  @Fields.createdAt({
    caption: "הועלה בתאריך"
  })
  uploadedAt!: Date;

  @Fields.string({
    caption: "הועלה על ידי",
    allowNull: true
  })
  uploadedBy?: string;
}