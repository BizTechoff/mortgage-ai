// src/server/entities/whatsapp-conversation.entity.ts
import { Entity, Field, Fields, IdEntity } from 'remult';
import { RequestType } from '../enum/request-type.enum';

@Entity<WhatsAppConversation>('conversation', {
    caption: 'צאטים',
    allowApiCrud: true, // ניתן לנהל ישויות אלו דרך ה-API (בזהירות)
})
export class WhatsAppConversation extends IdEntity {

    @Fields.string({ caption: 'מזהה צ׳אט' })
    chatId = ''; // ה-ID של הצ'אט בוואטסאפ (לדוגמה, 972501234567@c.us)

    @Fields.string({ caption: 'מספר נייד' })
    fromMobile = ''; // מספר הטלפון של הלקוח

    @Fields.string({ allowApiUpdate: false, caption: 'שם לקוח' }) // לא ניתן לשנות את השם דרך ה-API לאחר יצירה ראשונית
    fromName = ''; // שם הלקוח (אם ידוע)

    @Fields.string({ caption: 'שלב שיחה נוכחי' }) // שלב השיחה הנוכחי
    currentStep = 'initial_greeting'

    @Fields.string({ caption: 'הודעה אחרונה שנשלחה' }) // תוכן ההודעה האחרונה שנשלחה על ידי הבוט
    lastSentMessageText = '';

    @Fields.date({ allowApiUpdate: false, caption: 'זמן שליחה אחרונה' }) // חותמת זמן של ההודעה האחרונה שנשלחה
    lastSentMessageTime!: Date;

    @Fields.string({ caption: 'הודעה אחרונה שהתקבלה' }) // תוכן ההודעה האחרונה שהתקבלה מהלקוח
    lastReceivedMessageText = '';

    @Fields.date({ allowApiUpdate: false, caption: 'זמן קבלה אחרונה' }) // חותמת זמן של ההודעה האחרונה שהתקבלה
    lastReceivedMessageTime!: Date;

    @Fields.json({ caption: 'נתונים נוספים' }) // נתונים נוספים ספציפיים למצב השיחה
    context!: any;

    @Fields.date({ allowNull: true, caption: 'נוצר בתאריך' })
    createdAt!: Date; // זמן יצירת הישות

    @Fields.date({ allowNull: true, caption: 'עודכן בתאריך' })
    updatedAt!: Date; // זמן עדכון אחרון של הישות

    // שדה חדש מסוג RequestType enum
    @Field(() => RequestType, {
        caption: 'סוג בקשת משכנתה', // כיתוב השדה
        allowNull: true // יכול להיות ריק בהתחלה
    })
    selectedRequestType = RequestType.new

}
