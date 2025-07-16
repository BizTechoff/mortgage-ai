import { Injectable } from "@angular/core";
import { catchError, from, Observable, throwError } from "rxjs";
import { AppointmentController } from "../../shared/controller/appointment.controller";
import { AppointmentDetails, AppointmentWithDetails } from "../../shared/type/appointment.type";

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {

    // --- ADD THIS MISSING METHOD ---
    getAppointmentsByRequestId(requestId: string): Observable<AppointmentDetails[]> {
        // Assuming RequestController or a dedicated AppointmentController has a backend method for this
        // Let's assume RequestController will handle getting appointments for a request.
        return from(AppointmentController.getAppointmentsByRequestId(requestId)).pipe( // <-- You'll need to add getAppointmentsForRequest to RequestController
            catchError(error => {
                console.error('Error in CalendarService.getAppointmentsByRequestId:', error);
                return throwError(() => error);
            })
        );
    }

    getUpcomingAppointments(start = new Date(), max = 10): Observable<AppointmentWithDetails[]> {
        return from(AppointmentController.getUpcomingAppointments(start, max)).pipe( // <-- You'll need to add getAppointmentsForRequest to RequestController
            catchError(error => {
                console.error('Error in CalendarService.getAppointmentsByRequestId:', error);
                return throwError(() => error);
            })
        );
    }

    // addAppointment(app:AppointmentDetails): Observable<AppointmentDetails[]> {
    //     return from(AppointmentController.addAppointment(app)).pipe( // <-- You'll need to add getAppointmentsForRequest to RequestController
    //         catchError(error => {
    //             console.error('Error in CalendarService.addAppointment:', error);
    //             return throwError(() => error);
    //         })
    //     );
    // }

}
