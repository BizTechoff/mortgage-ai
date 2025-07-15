import { BackendMethod, Controller, remult } from "remult";
import { User } from "../entity/user.entity";
import { Roles } from "../enum/roles";
import { getCustomers } from "../../server/service/server.snpv.service";
import { snpvCustomer } from "../type/snpv.type";

@Controller('user') // Define the API path for this controller
export class SnpvController {


    /**
         * Retrieves a list of users who have the 'operator' role.
         * @returns An array of User entities with the operator role.
         */
    @BackendMethod({ allowed: true }) // הרשאה למנהל, אדמין ומתפעלים להציג רשימה זו
    static async getCustomers(): Promise<snpvCustomer[]> {
        return await getCustomers()
    }

}
