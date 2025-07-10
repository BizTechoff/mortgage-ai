import { Stage } from "../shared/entity/stage.entity"
import { RequestType } from "../shared/enum/request-type.enum"

export const seendStages = async (remult: any) => {
    const existing = await remult.repo(Stage).count()
    if (existing === 0) {
        const stages =
            [
                { requestType: RequestType.new, seq: 1, desc: 'תכנון אסטרטגי וסגירת עסקה', days: 20 },
                { requestType: RequestType.new, seq: 2, desc: 'איסוף מסמכים', days: 20 },
                { requestType: RequestType.new, seq: 3, desc: 'בדיקת תיק והגשה לצורך קבלת אישור עקרוני', days: 20 },
                { requestType: RequestType.new, seq: 4, desc: 'קבלת אישור עקרוני', days: 20 },
                { requestType: RequestType.new, seq: 5, desc: 'ניהול משא ומתן', days: 20 },
                { requestType: RequestType.new, seq: 6, desc: 'השלמת מסמכים לאישור סופי', days: 20 },
                { requestType: RequestType.new, seq: 7, desc: 'בטחונות', days: 20 },
                { requestType: RequestType.new, seq: 8, desc: 'חתימה על משכנתה', days: 20 },
                { requestType: RequestType.new, seq: 9, desc: 'קבלת כסף', days: 20 },

                { requestType: RequestType.renew, seq: 1, desc: 'תכנון אסטרטגי וסגירת עסקה', days: 20 },
                { requestType: RequestType.renew, seq: 2, desc: 'איסוף מסמכים', days: 20 },
                { requestType: RequestType.renew, seq: 3, desc: 'בדיקת תיק והגשה לאישור עקרוני', days: 20 },
                { requestType: RequestType.renew, seq: 4, desc: 'קבלת אישור עקרוני', days: 20 },
                { requestType: RequestType.renew, seq: 5, desc: 'ניהול משא ומתן', days: 20 },
                { requestType: RequestType.renew, seq: 6, desc: 'סגירת הצעה סופית', days: 20 },
                { requestType: RequestType.renew, seq: 7, desc: 'קבלת מסמכים לרישום בטחונות (במקרה של מחזור חיצוני)', days: 20 },
                { requestType: RequestType.renew, seq: 8, desc: 'חתימה על מחזור', days: 20 },
                { requestType: RequestType.renew, seq: 9, desc: 'ביצוע של המחזור', days: 20 }

            ]
        await remult.repo(Stage).insert(stages)
    }
}