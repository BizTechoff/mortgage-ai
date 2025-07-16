import { BackendMethod, Controller, ControllerBase } from "remult";
import { AppointmentDetails } from "../type/appointment.type";
import { CalendarEvent } from "../type/calendar.type";


@Controller('calendar')
export class CalendarController extends ControllerBase {

    static getEventsHandler = async (requestId: string) => [] as CalendarEvent[]
    static getNext7FreeAppointmentHandler = async (start: Date) => [] as AppointmentDetails[]
    static addAppointmentHandler = async (event: CalendarEvent) => false

    @BackendMethod({ allowed: true })
    static async getEvents(requestId: string): Promise<CalendarEvent[]> {
        return await CalendarController.getEventsHandler(requestId)
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
    static async getNext7FreeAppointment(start = new Date()): Promise<AppointmentDetails[]> {
        return await CalendarController.getNext7FreeAppointmentHandler(start)
    }

}
