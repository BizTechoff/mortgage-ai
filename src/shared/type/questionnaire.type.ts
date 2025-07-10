// src/shared/types/mortgage-questionnaire.interface.ts
import { RequestType } from "../enum/request-type.enum";

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  order: number;
  placeholder?: string;
  helpText?: string;
  validations?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: Array<{
      value: string;
      label: string;
    }>;
  };
  conditionalDisplay?: {
    dependsOn: string;
    showWhen: string | number | boolean;
  };
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireResponse {
  questionnaireId: string;
  requestId: string;
  answers: Array<{
    questionId: string;
    value: string | number | boolean | Date | string[];
  }>;
  completedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// New Mortgage Questionnaire
export const NEW_MORTGAGE_QUESTIONNAIRE: QuestionnaireQuestion[] = [
  {
    id: 'personal_fullname',
    text: 'שם מלא',
    type: 'text',
    required: true,
    order: 1,
    placeholder: 'נא להזין שם מלא'
  },
  {
    id: 'personal_id',
    text: 'מספר תעודת זהות',
    type: 'text',
    required: true,
    order: 2,
    placeholder: 'נא להזין 9 ספרות',
    validations: {
      pattern: '^\\d{9}$'
    }
  },
  {
    id: 'personal_birth_date',
    text: 'תאריך לידה',
    type: 'date',
    required: true,
    order: 3
  },
  {
    id: 'personal_marital_status',
    text: 'מצב משפחתי',
    type: 'select',
    required: true,
    order: 4,
    validations: {
      options: [
        { value: 'single', label: 'רווק/ה' },
        { value: 'married', label: 'נשוי/אה' },
        { value: 'divorced', label: 'גרוש/ה' },
        { value: 'widowed', label: 'אלמן/ה' }
      ]
    }
  },
  {
    id: 'partner_exists',
    text: 'האם ישנו בן/בת זוג שותף/ה לבקשה?',
    type: 'boolean',
    required: true,
    order: 5
  },
  {
    id: 'partner_fullname',
    text: 'שם מלא של בן/בת הזוג',
    type: 'text',
    required: true,
    order: 6,
    conditionalDisplay: {
      dependsOn: 'partner_exists',
      showWhen: true
    }
  },
  {
    id: 'partner_id',
    text: 'מספר תעודת זהות של בן/בת הזוג',
    type: 'text',
    required: true,
    order: 7,
    placeholder: 'נא להזין 9 ספרות',
    validations: {
      pattern: '^\\d{9}$'
    },
    conditionalDisplay: {
      dependsOn: 'partner_exists',
      showWhen: true
    }
  },
  {
    id: 'personal_income',
    text: 'הכנסה חודשית ברוטו',
    type: 'number',
    required: true,
    order: 8,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'partner_income',
    text: 'הכנסה חודשית ברוטו של בן/בת הזוג',
    type: 'number',
    required: true,
    order: 9,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    },
    conditionalDisplay: {
      dependsOn: 'partner_exists',
      showWhen: true
    }
  },
  {
    id: 'property_type',
    text: 'סוג הנכס',
    type: 'select',
    required: true,
    order: 10,
    validations: {
      options: [
        { value: 'apartment', label: 'דירה' },
        { value: 'house', label: 'בית פרטי' },
        { value: 'duplex', label: 'דופלקס' },
        { value: 'penthouse', label: 'פנטהאוז' },
        { value: 'garden_apt', label: 'דירת גן' },
        { value: 'land', label: 'קרקע' }
      ]
    }
  },
  {
    id: 'property_city',
    text: 'עיר',
    type: 'text',
    required: true,
    order: 11
  },
  {
    id: 'property_price',
    text: 'מחיר הנכס',
    type: 'number',
    required: true,
    order: 12,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'property_size',
    text: 'גודל הנכס (במ"ר)',
    type: 'number',
    required: true,
    order: 13,
    validations: {
      min: 0
    }
  },
  {
    id: 'funding_percentage',
    text: 'אחוז מימון מבוקש',
    type: 'select',
    required: true,
    order: 14,
    validations: {
      options: [
        { value: '25', label: 'עד 25%' },
        { value: '40', label: '26% - 40%' },
        { value: '60', label: '41% - 60%' },
        { value: '75', label: '61% - 75%' },
        { value: '100', label: 'מעל 75%' }
      ]
    }
  },
  {
    id: 'loan_amount',
    text: 'סכום הלוואה מבוקש',
    type: 'number',
    required: true,
    order: 15,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'loan_period',
    text: 'תקופת הלוואה מבוקשת (בשנים)',
    type: 'select',
    required: true,
    order: 16,
    validations: {
      options: [
        { value: '5', label: 'עד 5 שנים' },
        { value: '10', label: '6-10 שנים' },
        { value: '15', label: '11-15 שנים' },
        { value: '20', label: '16-20 שנים' },
        { value: '25', label: '21-25 שנים' },
        { value: '30', label: '26-30 שנים' }
      ]
    }
  },
  {
    id: 'has_equity',
    text: 'האם יש נכסים נוספים בבעלותך?',
    type: 'boolean',
    required: true,
    order: 17
  },
  {
    id: 'existing_loans',
    text: 'האם יש הלוואות קיימות?',
    type: 'boolean',
    required: true,
    order: 18
  },
  {
    id: 'existing_loans_amount',
    text: 'סכום הלוואות קיימות חודשי',
    type: 'number',
    required: true,
    order: 19,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    },
    conditionalDisplay: {
      dependsOn: 'existing_loans',
      showWhen: true
    }
  },
  {
    id: 'comments',
    text: 'הערות נוספות',
    type: 'text',
    required: false,
    order: 20
  }
];

// Refinance Mortgage Questionnaire
export const REFINANCE_MORTGAGE_QUESTIONNAIRE: QuestionnaireQuestion[] = [
  {
    id: 'personal_fullname',
    text: 'שם מלא',
    type: 'text',
    required: true,
    order: 1,
    placeholder: 'נא להזין שם מלא'
  },
  {
    id: 'personal_id',
    text: 'מספר תעודת זהות',
    type: 'text',
    required: true,
    order: 2,
    placeholder: 'נא להזין 9 ספרות',
    validations: {
      pattern: '^\\d{9}$'
    }
  },
  {
    id: 'current_bank',
    text: 'בנק נוכחי',
    type: 'select',
    required: true,
    order: 3,
    validations: {
      options: [
        { value: 'leumi', label: 'לאומי' },
        { value: 'poalim', label: 'הפועלים' },
        { value: 'discount', label: 'דיסקונט' },
        { value: 'mizrahi', label: 'מזרחי טפחות' },
        { value: 'jerusalem', label: 'ירושלים' },
        { value: 'first_international', label: 'הבינלאומי' },
        { value: 'other', label: 'אחר' }
      ]
    }
  },
  {
    id: 'mortgage_start_date',
    text: 'תאריך התחלת המשכנתה',
    type: 'date',
    required: true,
    order: 4
  },
  {
    id: 'total_original_amount',
    text: 'סכום משכנתה מקורי',
    type: 'number',
    required: true,
    order: 5,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'current_balance',
    text: 'יתרה נוכחית',
    type: 'number',
    required: true,
    order: 6,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'current_monthly_payment',
    text: 'תשלום חודשי נוכחי',
    type: 'number',
    required: true,
    order: 7,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'property_type',
    text: 'סוג הנכס',
    type: 'select',
    required: true,
    order: 8,
    validations: {
      options: [
        { value: 'apartment', label: 'דירה' },
        { value: 'house', label: 'בית פרטי' },
        { value: 'duplex', label: 'דופלקס' },
        { value: 'penthouse', label: 'פנטהאוז' },
        { value: 'garden_apt', label: 'דירת גן' },
        { value: 'land', label: 'קרקע' }
      ]
    }
  },
  {
    id: 'property_city',
    text: 'עיר',
    type: 'text',
    required: true,
    order: 9
  },
  {
    id: 'property_value',
    text: 'שווי נוכחי של הנכס (הערכה)',
    type: 'number',
    required: true,
    order: 10,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'personal_income',
    text: 'הכנסה חודשית ברוטו',
    type: 'number',
    required: true,
    order: 11,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'partner_income',
    text: 'הכנסה חודשית ברוטו של בן/בת הזוג (אם קיים)',
    type: 'number',
    required: false,
    order: 12,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  },
  {
    id: 'additional_cash',
    text: 'האם מעוניין למשוך סכום נוסף במסגרת המחזור?',
    type: 'boolean',
    required: true,
    order: 13
  },
  {
    id: 'additional_cash_amount',
    text: 'סכום נוסף מבוקש',
    type: 'number',
    required: true,
    order: 14,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    },
    conditionalDisplay: {
      dependsOn: 'additional_cash',
      showWhen: true
    }
  },
  {
    id: 'desired_monthly_payment',
    text: 'תשלום חודשי רצוי',
    type: 'number',
    required: false,
    order: 15,
    placeholder: 'נא להזין סכום בש"ח',
    validations: {
      min: 0
    }
  }
];