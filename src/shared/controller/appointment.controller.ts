import { BackendMethod, Controller, ControllerBase, remult } from "remult";

import { dateDbFormat } from "../../app/common/dateFunc";
import { MortgageRequest } from "../entity/request.entity";
import { RequestStatus } from "../enum/request-status.enum";
import { AppointmentDetails, AppointmentWithDetails } from "../type/appointment.type";


@Controller('appointment')
export class AppointmentController extends ControllerBase {

    @BackendMethod({ allowed: true })
    static async getAppointmentsByRequestId(requestId: string): Promise<AppointmentDetails[]> {
        const result = [] as AppointmentDetails[]
        const request = await remult.repo(MortgageRequest)
            .findOne({ where: { id: requestId } })
        if (request && request.appointmentDetails) {
            result.push(request.appointmentDetails)
        }
        return result
    }

    @BackendMethod({ allowed: true })
    static async getUpcomingAppointments(start = new Date(), max = 10): Promise<AppointmentWithDetails[]> {
        const result = [] as AppointmentWithDetails[]
        for await (const a of remult.repo(MortgageRequest).query(
            {
                where: { status: RequestStatus.unCompletedStatus() },
                include: { customer: true }
            })) {
            if (a.appointmentDetails) {
                // console.log('getUpcomingAppointments - 1', a.appointmentDetails.date, start, +a.appointmentDetails.date, +start, +a.appointmentDetails.date >= +start)
                const appDate = dateDbFormat(new Date(a.appointmentDetails.date))
                // console.log('getUpcomingAAAAAAAAAAAAAA')
                const startDate = dateDbFormat(new Date(start))
                // console.log('getUpcomingBBBBBBBBBB')
                // console.log('getUpcomingAppointments - 1', a.appointmentDetails.date, start, appDate, startDate, appDate >= startDate)
                if (appDate >= startDate) {
                    result.push({
                        customer: {
                            name: a.customer.name,
                            phone: a.customer.mobile
                        },
                        request: { requestType: a.requestType.caption },
                        startDate: a.appointmentDetails.date,
                        title: 'פגישה',
                        description: 'תיאור'
                    })
                    if (result.length === max) {
                        break
                    }
                }
            }
        }
        return result
    }

}