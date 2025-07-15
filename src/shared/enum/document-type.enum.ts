// src/shared/enums/document-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class DocumentType {
  static ID_CARD = new DocumentType('id_card', 'תעודת זהות');
  static SALARY_SLIP = new DocumentType('salary_slip', 'תלוש שכר');
  static BANK_STATEMENT = new DocumentType('bank_statement', 'דף חשבון בנק');
  static PROPERTY_DOCS = new DocumentType('property_docs', 'מסמכי הנכס (טאבו/חוזה)');
  static PROPERTY_RIGHTS = new DocumentType('property_rights', 'אישור זכויות בנכס');
  static EXISTING_MORTGAGE = new DocumentType('existing_mortgage', 'פרטי משכנתה קיימת');
  static PROPERTY_VALUATION = new DocumentType('property_valuation', 'שומה נכס');
  static INCOME_CONFIRMATION = new DocumentType('income_confirmation', 'אישור הכנסות');
  static TAX_RETURN = new DocumentType('tax_return', 'דוח שנתי לרשויות המס');
  static FINANCIAL_STATEMENT = new DocumentType('financial_statement', 'דוח כספי');
  static MORTGAGE_STATEMENT = new DocumentType('mortgage_statement', 'דוח יתרות');
  static OTHER = new DocumentType('other', 'אחר');

  constructor(
    public id: string,
    public caption: string
  ) { }
  
  static fromString(option: string): DocumentType {
    switch (option) {
      case 'id_card':
        return DocumentType.ID_CARD;
      case 'salary_slip':
        return DocumentType.SALARY_SLIP;
      case 'bank_statement':
        return DocumentType.BANK_STATEMENT;
      case 'property_docs':
        return DocumentType.PROPERTY_DOCS;
      case 'mortgage_statement':
        return DocumentType.MORTGAGE_STATEMENT;
      case 'property_rights':
        return DocumentType.PROPERTY_RIGHTS;
      case 'existing_mortgage':
        return DocumentType.EXISTING_MORTGAGE;
      case 'property_valuation':
        return DocumentType.PROPERTY_VALUATION;
      case 'income_confirmation':
        return DocumentType.INCOME_CONFIRMATION;
      case 'tax_return':
        return DocumentType.TAX_RETURN;
      case 'financial_statement':
        return DocumentType.FINANCIAL_STATEMENT;
      case 'other':
        return DocumentType.OTHER;
      default:
        throw new Error(`Unknown document type: ${option}`);
    }
  }

  static getAllTypes(): DocumentType[] {
    return Object.values(DocumentType).filter(type =>
      type instanceof DocumentType
    ) as DocumentType[];
  }

  static getRequiredForNewMortgage(): DocumentType[] {
    return [
      DocumentType.ID_CARD,
      DocumentType.SALARY_SLIP,
      DocumentType.BANK_STATEMENT,
      DocumentType.INCOME_CONFIRMATION
    ];
  }

  static getRequiredForRefinancing(): DocumentType[] {
    return [
      DocumentType.ID_CARD,
      DocumentType.SALARY_SLIP,
      DocumentType.BANK_STATEMENT,
      DocumentType.EXISTING_MORTGAGE,
      DocumentType.PROPERTY_VALUATION,
      DocumentType.INCOME_CONFIRMATION
    ];
  }
}

export const DocumentTypeLabels: Record<string, string> = {
  'id_card': 'תעודת זהות',
  'salary_slip': 'תלוש שכר',
  'bank_statement': 'דף חשבון בנק',
  'property_rights': 'אישור זכויות בנכס',
  'existing_mortgage': 'פרטי משכנתה קיימת',
  'property_valuation': 'שומה נכס',
  'income_confirmation': 'אישור הכנסות',
  'tax_return': 'דוח שנתי לרשויות המס',
  'financial_statement': 'דוח כספי',
  'other': 'אחר'
};