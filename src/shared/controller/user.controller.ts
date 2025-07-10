import { BackendMethod, Controller, remult } from "remult";
import { User } from "../entity/user.entity";
import { Roles } from "../enum/roles";

@Controller('user') // Define the API path for this controller
export class UserController {


    /**
         * Retrieves a list of users who have the 'operator' role.
         * @returns An array of User entities with the operator role.
         */
    @BackendMethod({ allowed: true }) // הרשאה למנהל, אדמין ומתפעלים להציג רשימה זו
    static async getOperators(): Promise<User[]> {
        // מחזיר רשימה של משתמשים שהוגדרו כ"מתפעלת" (operator = true)
        return remult.repo(User).find({
            where: {
                disabled: false,
                operator: true // מסנן רק משתמשים שהם מתפעלים
            },
            orderBy: { name: "asc" } // ממיין לפי שם לוח בקרה נוח
        });
    }

}
