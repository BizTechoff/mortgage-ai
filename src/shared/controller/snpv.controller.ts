import { BackendMethod, Controller } from "remult";
import { snpvCustomer } from "../type/snpv.type";

@Controller('snpv') // Define the API path for this controller
export class SnpvController {

    static getCustomersHandler = async () => [] as snpvCustomer[]
    static getCustomerHandler = async (mobile: string) => ({} as snpvCustomer)
    static addCustomerHandler = async (customer: snpvCustomer) => ({} as snpvCustomer)

    /**
         * Retrieves a list of users who have the 'operator' role.
         * @returns An array of User entities with the operator role.
         */
    @BackendMethod({ allowed: true }) // הרשאה למנהל, אדמין ומתפעלים להציג רשימה זו
    static async getCustomers(): Promise<snpvCustomer[]> {
        return await SnpvController.getCustomersHandler()
    }

    @BackendMethod({ allowed: true }) // הרשאה למנהל, אדמין ומתפעלים להציג רשימה זו
    static async getCustomer(mobile: string): Promise<snpvCustomer> {
        return await SnpvController.getCustomerHandler(mobile)
    }

    @BackendMethod({ allowed: true }) // הרשאה למנהל, אדמין ומתפעלים להציג רשימה זו
    static async addCustomer(customer: snpvCustomer): Promise<snpvCustomer> {
        return await SnpvController.addCustomerHandler(customer)
    }

}
