import { config } from "dotenv";
import { fixPhoneInput } from "../../app/common/fields/PhoneField";
import { SnpvController } from "../../shared/controller/snpv.controller";
import { snpvCustomer } from "../../shared/type/snpv.type";
console.log('server.snpv.ts loaded')

SnpvController.getCustomersHandler = async () => getCustomers()
SnpvController.getCustomerHandler = async mobile => getCustomer(mobile)
SnpvController.addCustomerHandler = async customer => addCustomer(customer)

config()
const isProduction = process.env['NODE_ENV'] === "production";

export const getCustomers = async (): Promise<snpvCustomer[]> => {

    const result = [] as snpvCustomer[]

    const url = process.env['SNPV_API_URL_GET_CUSTOMERS']!
    const key = process.env['SNPV_API_KEY']!
    const req = `${url}?api_key=${key}`

    const headers = {
        'Content-Type': 'application/json'
    }

    try {
        const response = await fetch(req, { headers: headers });
        const json = await response.json();
        if (json.response) {
            for (const customer of json.responseClients) {
                const mobile1 = fixPhoneInput(customer.phone_1)
                const mobile2 = fixPhoneInput(customer.phone_2)
                if (mobile1.length || mobile2.length) {
                    const cust: snpvCustomer = {
                        uid: customer.uuid,
                        mobiles: [
                            fixPhoneInput(customer.phone_1),
                            fixPhoneInput(customer.phone_2)],
                        names: [customer.firstname_1, customer.firstname_2],
                        url: customer.url,
                        lead: customer.lead
                    }
                    result.push(cust)
                    // if (result.length > 10) break
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
    // console.log('result.length', result.length)
    // console.log('result', result)
    return result
}

export const getCustomer = async (mobile = ''): Promise<snpvCustomer> => {
    const result: snpvCustomer = { uid: '', mobiles: [] as string[], names: [] as string[], url: '', lead: false }
    console.log('call to snpv get-customer')

    const url = process.env['SNPV_API_URL_GET_CUSTOMER']!
    const key = process.env['SNPV_API_KEY']!
    // const req = `${url}?api_key=${key}&type=phone`
    const req = `${url}?api_key=${key}&type=phone&phone=${mobile}`
    console.log('req', req)
    const headers = {
        'Content-Type': 'application/json'
    }

    try {
        const response = await fetch(req, { headers: headers });
        const json = await response.json();

        if (json.response) {
            result.uid = json.responseClientFields.uuid;
            result.mobiles.push(fixPhoneInput(json.responseClientFields.phone_1))
            result.mobiles.push(fixPhoneInput(json.responseClientFields.phone_2))
            result.names.push(json.responseClientFields.firstname_1)
            result.names.push(json.responseClientFields.firstname_2)
            result.lead = json.responseClientFields.lead;
            result.url = json.responseClientFields.url;
            // console.log('result', result);
        }
    } catch (err) {
        console.error(err);
    }

    return result
}

export const addCustomer = async (customer: snpvCustomer): Promise<snpvCustomer> => {
    console.log('call to snpv get-customer')

    const url = process.env['SNPV_API_URL_ADD_CUSTOMER']!
    const key = process.env['SNPV_API_KEY']!


    // const req = `${url}?api_key=${key}&type=phone`
    const req = `${url}`
    console.log('req', req)
    const headers = {
        'Content-Type': 'application/json'
    }
    const phone_1 = customer.mobiles.length > 0 ? customer.mobiles[0] : ''
    const phone_2 = customer.mobiles.length > 1 ? customer.mobiles[1] : ''
    const firstname_1 = customer.names.length > 0 ? customer.names[0] : ''
    const firstname_2 = customer.names.length > 1 ? customer.names[1] : ''

    const body = {
        api_key: `${key}`,
        params: {
            lead: customer.lead,
            phone_1: phone_1,
            phone_2: phone_2,
            firstname_1: firstname_1,
            firstname_2: firstname_2
        }
    }

    try {
        if (isProduction) {
            const response = await fetch(req, { headers: headers, body: JSON.stringify(body) });
            const json = await response.json();

            if (json.response) {
                console.log('json.response', json.response, JSON.stringify(json.response));
            }
        }
        else { console.info(`DEV MODE - NO ADDING TO SNPV (customer: ${JSON.stringify(customer)})`) }
    } catch (err) {
        console.error(err);
    }

    return customer
}
