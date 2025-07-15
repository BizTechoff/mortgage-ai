import { Injectable } from "@angular/core";
import { catchError, from, map, Observable, throwError } from "rxjs";
import { AppointmentController } from "../../shared/controller/appointment.controller";
import { AppointmentDetails } from "../../shared/type/appointment.type";

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

}
