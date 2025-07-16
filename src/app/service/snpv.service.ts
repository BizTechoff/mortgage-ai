import { Injectable } from "@angular/core";
import { catchError, from, Observable, throwError } from "rxjs";
import { SnpvController } from "../../shared/controller/snpv.controller";
import { snpvCustomer } from "../../shared/type/snpv.type";

@Injectable({
    providedIn: 'root'
})
export class SnpvService {

    getCustomers(): Observable<snpvCustomer[]> {
        return from(SnpvController.getCustomers()).pipe(
            // map(response => response),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    getCustomer(mobile: string): Observable<snpvCustomer> {
        return from(SnpvController.getCustomer(mobile)).pipe(
            // map(response => response),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    addCustomer(customer: snpvCustomer): Observable<snpvCustomer> {
        return from(SnpvController.addCustomer(customer)).pipe(
            // map(response => response),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

}
