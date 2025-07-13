import { APP_INITIALIZER, NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatListModule } from '@angular/material/list'
import { MatMenuModule } from '@angular/material/menu'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatToolbarModule } from '@angular/material/toolbar'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // הוסף ייבוא זה
import { CommonUIElementsModule } from 'common-ui-elements'
import { remult } from 'remult'
import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { AdminGuard, AdminOrManagerGuard, AdminOrManagerOrOperatorGuard, CustomerGuard, ManagerGuard, OperatorGuard } from './auth/AuthGuard'
import { AddressInputComponent } from './common/address-input/address-input.component'
import { DataAreaDialogComponent } from './common/data-area-dialog/data-area-dialog.component'
import { DotsMenuComponent } from './common/dot-menu.component'
import { InputImageComponent } from './common/input-image/input-image.component'
import { MultiSelectListDialogComponent } from './common/multi-select-list-dialog/multi-select-list-dialog.component'
import { TextAreaDataControlComponent } from './common/textarea-data-control/textarea-data-control.component'
import { UIToolsService } from './common/UIToolsService'
import { YesNoQuestionComponent } from './common/yes-no-question/yes-no-question.component'
import { DemoDataControlAndDataAreaComponent } from './helper/demo-data-control-and-data-area/demo-data-control-and-data-area.component'
import { HomeComponent } from './home/home.component'
import { AppointmentService } from './service/appointment.service'
import { CalendarService } from './service/callendar.service'
import { OperatorService } from './service/operator.service'
import { RequestService } from './service/request.service'
import { UserService } from './service/user.service'
import { MortgageRequestAssignRequestComponent } from './ui/dialog/mortgage-request-assign-request/mortgage-request-assign-request.component'
import { MortgageRequestUpdateStatusComponent } from './ui/dialog/mortgage-request-update-status/mortgage-request-update-status.component'
import { AdminComponent } from './ui/route/admin/admin.component'
import { ClientComponent } from './ui/route/client/client.component'
import { LoginComponent } from './ui/route/login/login.component'
import { OperatorComponent } from './ui/route/operator/operator.component'
import { UsersComponent } from './ui/route/users/users.component'
import { RequestComponent } from './ui/route/request/request.component'
import { CustomerListComponent } from './ui/route/customer-list/customer-list.component'

@NgModule({
  declarations: [
    AppComponent,
    UsersComponent,
    CustomerListComponent,
    HomeComponent,
    LoginComponent,
    AdminComponent,
    OperatorComponent,
    ClientComponent,
    RequestComponent,
    MortgageRequestAssignRequestComponent,
    MortgageRequestUpdateStatusComponent,
    YesNoQuestionComponent,
    DataAreaDialogComponent,
    TextAreaDataControlComponent,
    AddressInputComponent,
    DotsMenuComponent,
    MultiSelectListDialogComponent,
    InputImageComponent,
    DemoDataControlAndDataAreaComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    CommonUIElementsModule,
    ReactiveFormsModule 
  ],
  providers: [
    UIToolsService,
    AdminGuard,
    ManagerGuard,
    OperatorGuard,
    CustomerGuard,
    AdminOrManagerGuard,
    AdminOrManagerOrOperatorGuard,
    RequestService,
    CalendarService,
    AppointmentService,
    OperatorService,
    UserService,
    { provide: APP_INITIALIZER, useFactory: initApp, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }

export function initApp() {
  const loadCurrentUserBeforeAppStarts = async () => {
    await remult.initUser()
  }
  return loadCurrentUserBeforeAppStarts
}
