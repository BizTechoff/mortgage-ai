import { Injectable } from "@angular/core";
import { catchError, from, Observable, throwError } from "rxjs";
import { CalendarController } from "../../shared/controller/calendar.controller";
import { CalendarEvent } from "../../shared/type/calendar.type";
import { AppointmentDetails } from "../../shared/type/appointment.type";

@Injectable({
    providedIn: 'root'
})
export class CalendarService {

    getEvents(requestId: string): Observable<CalendarEvent[]> {
        return from(CalendarController.getEvents(requestId)).pipe(
            // map(response => response),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    getNext7FreeAppointment(start = new Date()): Observable<AppointmentDetails[]> {
        return from(CalendarController.getNext7FreeAppointment(start)).pipe(
            // map(response => response),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }
    
        addAppointment(app:AppointmentDetails): Observable<boolean> {
    console.log('CalendarService :: addAppointment :: ' + JSON.stringify(app));
            return from(CalendarController.addAppointment(app)).pipe( // <-- You'll need to add getAppointmentsForRequest to RequestController
                catchError(error => {
                    console.error('Error in CalendarService.addAppointment:', error);
                    return throwError(() => error);
                })
            );
        }

}
