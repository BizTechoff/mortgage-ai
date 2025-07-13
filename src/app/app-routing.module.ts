// src/app/app-routing.module.ts
import { ErrorHandler, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticatedGuard, CommonUIElementsModule, NotAuthenticatedGuard } from 'common-ui-elements';
import { terms } from '../shared/config/terms';
import { AdminGuard, AdminOrManagerGuard, AdminOrManagerOrOperatorGuard, CustomerGuard, ManagerGuard, OperatorGuard } from './auth/AuthGuard';
import { ShowDialogOnErrorErrorHandler } from './common/UIToolsService';
import { AdminComponent } from './ui/route/admin/admin.component';
import { ClientComponent } from './ui/route/client/client.component';
import { LoginComponent } from './ui/route/login/login.component';
import { OperatorComponent } from './ui/route/operator/operator.component';
import { RequestComponent } from './ui/route/request/request.component';
import { UsersComponent } from './ui/route/users/users.component';
import { CustomerListComponent } from './ui/route/customer-list/customer-list.component';

const defaultRoute = 'login'; // Changed default route to 'login'
const routes: Routes = [
  { path: defaultRoute, component: LoginComponent, canActivate: [NotAuthenticatedGuard], data: { name: 'כניסה' } }, // Set login as the default route component
  { path: 'admin', component: AdminComponent, canActivate: [AdminGuard], data: { name: 'לוח בקרה מנהלת' } },
  { path: 'operator', component: OperatorComponent, canActivate: [OperatorGuard], data: { name: 'לוח בקרה מתפעלת' } },
  { path: 'client', component: ClientComponent, canActivate: [CustomerGuard], data: { name: 'הבקשה שלי' } },

  // { path: terms.home, component: HomeComponent }, // 'home' now requires a specific path
  // { path: 'admin', component: AdminComponent, canActivate: [AdminOrManagerGuard], data: { name: 'לוח בקרה' } },
  // { path: 'operator', component: OperatorComponent, canActivate: [OperatorGuard], data: { name: 'ממשק מתפעלת' } },
  // { path: 'client', component: ClientComponent, canActivate: [CustomerGuard] }, //, canActivate: [CustomerGuard] },
  // // { path: 'request', component: MortgageRequestComponent, canActivate: [AuthenticatedGuard], data: { name: 'פרטי בקשה' } }, //, canActivate: [CustomerGuard] },
  { path: 'request/:id', component: RequestComponent, canActivate: [AuthenticatedGuard], data: { name: 'פרטי בקשה' } },
  // { path: 'assign/:id', component: MortgageRequestAssignRequestComponent, canActivate: [AuthenticatedGuard], data: { name: 'שיוך מתפעלת' } },

  { path: 'customer', component: CustomerListComponent, canActivate: [AdminOrManagerOrOperatorGuard], data: { name: 'לקוחות' } },
  // { path: 'demo', component: DemoDataControlAndDataAreaComponent },
  { path: 'user', component: UsersComponent, canActivate: [AdminGuard], data: { name: terms.userAccounts } },
  // { path: '/', redirectTo: '/' + defaultRoute, pathMatch: 'full' },
  { path: '', redirectTo: '/' + defaultRoute, pathMatch: 'full' },
  { path: '**', redirectTo: '/' + defaultRoute, pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes), CommonUIElementsModule],
  providers: [
    AdminGuard,
    ManagerGuard,
    OperatorGuard,
    CustomerGuard,
    AdminOrManagerGuard,
    AdminOrManagerOrOperatorGuard,
    { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler }
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }