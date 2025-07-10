import { Component, OnInit, ViewChild } from '@angular/core'
import { MatSidenav } from '@angular/material/sidenav'
import { ActivatedRoute, NavigationEnd, NavigationStart, Route, Router } from '@angular/router'

import { openDialog, RouteHelperService } from 'common-ui-elements'
import { remult } from 'remult'
import { filter, map, mergeMap, Subscription } from 'rxjs'
import { terms } from '../shared/config/terms'
import { User } from '../shared/entity/user.entity'
import { Roles } from '../shared/enum/roles'
import { SignInController } from './auth/SignInController'
import { UpdatePasswordController } from './auth/UpdatePasswordController'
import { DataAreaDialogComponent } from './common/data-area-dialog/data-area-dialog.component'
import { UIToolsService } from './common/UIToolsService'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isLoginPage: boolean = false;
  private routerSubscription: Subscription | undefined;

  constructor(
    public router: Router,
    public activeRoute: ActivatedRoute,
    private routeHelper: RouteHelperService,
    public uiService: UIToolsService
  ) { }
  terms = terms
  remult = remult
  isClient = () => remult.isAllowed(Roles.customer);

  async signIn() {
    const signIn = new SignInController()

    var success = await openDialog(
      DataAreaDialogComponent,
      (i) =>
      (i.args = {
        title: terms.signIn,
        fields: [signIn.$.mobile],
        // object: signIn,
        ok: async () => {
          const response = await signIn.signIn()
          if (response.success) {
            remult.user = response.userInfo
          }
          else {
            this.uiService.yesNoQuestion(response.error, false)
          }
        },
      }),
      (i) => i?.ok
    )

    if (success) {
      success = await openDialog(
        DataAreaDialogComponent,
        (i) =>
        (i.args = {
          title: terms.signIn,
          fields: [signIn.$.mobile],
          // object: signIn,
          ok: async () => {
            const response = await signIn.signIn()
            if (response.success) {
              remult.user = response.userInfo
            }
            else {
              this.uiService.yesNoQuestion(response.error, false)
            }
          },
        }),
        (i) => i?.ok
      )
    }
  }

  ngOnInit(): void {
    console.log('AppComponent: ' + this.router.url)

    this.routerSubscription = this.router.events.pipe(
      // טיפול באירועי NavigationStart
      filter(event => event instanceof NavigationStart),
      map(event => event as NavigationStart) // קאסט מפורש לטיפוס NavigationStart
    ).subscribe(event => {
      // לדוגמה, כאן תוכל לבדוק את ה-URL המיועד לפני הניווט המלא
      // או להגדיר דגל להצגת לודר
      console.log('Navigation Started to:', event.url);
      // לדוגמה: this.showLoader = true;
    });

    // המשך הפייפ הקיים עבור NavigationEnd
    this.routerSubscription.add( // הוסף את המנוי הזה למנוי הראשי
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activeRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter(route => route.outlet === 'primary'),
        mergeMap(route => route.data)
      ).subscribe(data => {
        console.log(data, 'data');
        this.isLoginPage = this.router.url.includes('/login');
        console.log('AppComponent Ended to: ' + this.router.url);
        // לדוגמה: this.showLoader = false; // הסתר את הלודר בסיום הניווט
      })
    );
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  signOut() {
    SignInController.signOut()
    remult.user = undefined
    this.router.navigate(['/'])
  }

  async updateInfo() {
    let user = (await remult.repo(User).findId(remult.user!.id))!
    openDialog(
      DataAreaDialogComponent,
      (i) =>
      (i.args = {
        title: terms.updateInfo,
        fields: [user.$.name],
        ok: async () => {
          await user._.save()
        },
      })
    )
  }
  async changePassword() {
    const updatePassword = new UpdatePasswordController()
    openDialog(
      DataAreaDialogComponent,
      (i) =>
      (i.args = {
        title: terms.signIn,
        object: updatePassword,
        ok: async () => {
          // await updatePassword.updatePassword()
        },
      })
    )
  }

  routeName(route: Route) {
    let name = route.path
    if (route.data && route.data['name']) name = route.data['name']
    return name
    return ''
  }

  currentTitle() {
    if (this.activeRoute!.snapshot && this.activeRoute!.firstChild)
      if (this.activeRoute.snapshot.firstChild!.data!['name']) {
        return this.activeRoute.snapshot.firstChild!.data['name']
      } else {
        if (this.activeRoute.firstChild.routeConfig)
          return this.activeRoute.firstChild.routeConfig.path
      }
    return 'mortgage-ai'
  }
  doesNotRequireLogin() {
    return this.activeRoute?.snapshot?.firstChild?.data?.['noLogin']
  }

  shouldDisplayRoute(route: Route) {
    if (
      !(
        this.routeName(route) &&
        (route.path || '').indexOf(':') < 0 &&
        (route.path || '').indexOf('**') < 0 &&
        !route.data?.['hide']
      )
    )
      return false
    return this.routeHelper.canNavigateToRoute(route)
  }
  //@ts-ignore ignoring this to match angular 7 and 8
  @ViewChild('sidenav') sidenav: MatSidenav
  routeClicked() {
    if (this.uiService.isScreenSmall()) this.sidenav.close()
  }
}
