import { BackendMethod, Controller, ControllerBase } from "remult";
// import 'google-auth-library'
// import { getEvents } from "../../server/service/server.calendar";
import { CalendarEvent } from "../type/calendar.type";
// import { getEvents } from "../../server/service/server.calendar";
// import { GoogleCalendarService } from "../../server/service/googleCalendarService";
// import { getAvailableSlots } from "../../server/service/server.gmail.calendar";


@Controller('calendar')
export class CalendarController extends ControllerBase {

    static getEventsHandler = async (requestId: string) => [] as CalendarEvent[]

    // static getEventsHandler = async (requestId: string): Promise<CalendarEvent[]> => [] as CalendarEvent[]

    @BackendMethod({ allowed: true })

    // --- ADD THIS MISSING METHOD ---
    static async getEvents(requestId: string): Promise<CalendarEvent[]> {
        const events = [] as CalendarEvent[]

        const response = await CalendarController.getEventsHandler(requestId)
        events.push(...response)

        // const t = new GoogleCalendarService('')

        // console.log('getEvents..')
        // getEvents()
        // .then((events) => console.log('event list', events))
        // .catch((error) => console.error(error) )
        // console.log('getEvents finished')

        // const response = await getAvailableSlots()
        // console.log('response', response, JSON.stringify(response))

        console.log('CalendarController.getEvents ( events: ', JSON.stringify(events) + ' )')
        // const result = [] as AppointmentDetails[]
        // const request = await remult.repo(MortgageRequest)
        //     .findOne({ where: { id: requestId } })
        // if (request && request.appointmentDetails) {
        //     result.push(request.appointmentDetails)
        // }
        // return result
        return events
    }

}
