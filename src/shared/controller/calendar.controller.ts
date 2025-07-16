import { BackendMethod, Controller, ControllerBase } from "remult";
// import 'google-auth-library'
// import { getEvents } from "../../server/service/server.calendar";
import { AppointmentDetails } from "../type/appointment.type";
import { CalendarEvent } from "../type/calendar.type";
// import { getEvents } from "../../server/service/server.calendar";
// import { GoogleCalendarService } from "../../server/service/googleCalendarService";
// import { getAvailableSlots } from "../../server/service/server.gmail.calendar";


@Controller('calendar')
export class CalendarController extends ControllerBase {

    static getEventsHandler = async (requestId: string) => [] as CalendarEvent[]
    static getNext7FreeAppointmentHandler = async (start: Date) => [] as AppointmentDetails[]
    static addAppointmentHandler = async (event: CalendarEvent) => false

    // static getEventsHandler = async (requestId: string): Promise<CalendarEvent[]> => [] as CalendarEvent[]

    @BackendMethod({ allowed: true })
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

        // console.log('CalendarController.getEvents ( events: ', JSON.stringify(events) + ' )')
        // const result = [] as AppointmentDetails[]
        // const request = await remult.repo(MortgageRequest)
        //     .findOne({ where: { id: requestId } })
        // if (request && request.appointmentDetails) {
        //     result.push(request.appointmentDetails)
        // }
        // return result
        return events
    }

    @BackendMethod({ allowed: true })
    static async addAppointment(app: AppointmentDetails): Promise<boolean> {
    console.log('CalendarController :: addAppointment :: BBBBBBBBB');
    const date = new Date(app.date)
        const event: CalendarEvent = {

            start: { dateTime: date.toDateString(), timeZone: '' },
            description: 'מהפלטפורמה של לנה',
            eid: '',
            end: { dateTime: date.toDateString(), timeZone: '' },
            location: '',
            reminders: { useDefault: false },
            summary: '',
            // attendees: 
        }
    console.log('CalendarController :: addAppointment :: ' + JSON.stringify(event));
        return await CalendarController.addAppointmentHandler(event)
    }

    @BackendMethod({ allowed: true })

    // --- ADD THIS MISSING METHOD ---
    static async getNext7FreeAppointment(start = new Date()): Promise<AppointmentDetails[]> {
        const events = [] as AppointmentDetails[]

        const response = await CalendarController.getNext7FreeAppointmentHandler(start)
        events.push(...response)

        // const t = new GoogleCalendarService('')

        // console.log('getEvents..')
        // getEvents()
        // .then((events) => console.log('event list', events))
        // .catch((error) => console.error(error) )
        // console.log('getEvents finished')

        // const response = await getAvailableSlots()
        // console.log('response', response, JSON.stringify(response))

        // console.log('CalendarController.getEvents ( events: ', JSON.stringify(events) + ' )')
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
