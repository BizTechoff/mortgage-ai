import { Injectable, Injector } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Data,
  ParamMap,
  Route,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router'
import { Allowed, Remult } from 'remult'
import { Observable } from 'rxjs'

@Injectable()
export class RouteHelperService {
  constructor(private router: Router, private injector: Injector) { }

  navigateToComponent(toComponent: { new(...args: any[]): any }, queryParams?: { [key: string]: any }) {
    let done = false
    this.router.config.forEach((path) => {
      if (done) return
      if (path.component == toComponent) {
        done = true
        this.router.navigate(['/' + path.path], { queryParams: queryParams || {}, queryParamsHandling: 'merge' });
      }
    })
    if (!done)
      console.warn("couldn't find path for ", toComponent, this.router.config)
  }

canNavigateToRoute(route: Route, currentQueryParams?: { [key: string]: any }): boolean {
    if (!route.canActivate || route.canActivate.length === 0) return true;

    // --- Key Change: Declare root snapshot first and reference it ---
    // Use `Partial<ActivatedRouteSnapshot>` and cast to make it mutable during construction,
    // then cast back to `ActivatedRouteSnapshot` at the end.
    // This is a common workaround for mocking complex readonly types.

    const mockRootSnapshot: ActivatedRouteSnapshot = {
      params: {},
      queryParams: {},
      url: [],
      fragment: null,
      outlet: 'primary',
      component: null,
      routeConfig: null,
      firstChild: null,
      children: [], // Initialized as empty
      parent: null,
      pathFromRoot: [], // Initialized as empty
      paramMap: {} as ParamMap,
      queryParamMap: {} as ParamMap,
      title: undefined,
      data: {} as Data,
      root: null!, // Placeholder, will be self-referenced
      toString: () => `MockActivatedRouteSnapshot (Root)`
    };

    // Self-reference for the root snapshot (can be done immediately after declaration)
    (mockRootSnapshot.root as any) = mockRootSnapshot; // Cast to any to bypass readonly
    (mockRootSnapshot.pathFromRoot as any).push(mockRootSnapshot); // Cast to any


    const mockRouteSnapshot: ActivatedRouteSnapshot = {
      params: {},
      queryParams: currentQueryParams || {},
      url: [],
      fragment: null,
      outlet: 'primary',
      component: null,
      routeConfig: route,
      firstChild: null,
      children: [], // Initialized as empty
      parent: mockRootSnapshot, // Parent is the root snapshot
      pathFromRoot: [mockRootSnapshot], // Path starts from root
      paramMap: {} as ParamMap,
      queryParamMap: {} as ParamMap,
      title: undefined,
      data: route.data || {},
      root: mockRootSnapshot, // Point to the previously created root snapshot
      toString: () => `MockActivatedRouteSnapshot for ${route.path}`
    };

    // Update pathFromRoot for the current route snapshot
    (mockRouteSnapshot.pathFromRoot as any).push(mockRouteSnapshot); // Cast to any

    // Link children (current route is a child of the root)
    (mockRootSnapshot.children as any).push(mockRouteSnapshot); // Cast to any


    // Create the mock RouterStateSnapshot
    const mockRouterStateSnapshot: RouterStateSnapshot = {
      url: route.path + (currentQueryParams ? '?' + new URLSearchParams(currentQueryParams).toString() : ''),
      root: mockRootSnapshot,
      toString: () => `MockRouterStateSnapshot for ${route.path}`
    };

    for (let guardType of route.canActivate) {
      const g = this.injector.get(guardType) as CanActivate;
      if (g && g.canActivate) {
        const guardResult: any = g.canActivate(mockRouteSnapshot, mockRouterStateSnapshot);

        if (guardResult instanceof Observable) {
          console.warn(`Guard ${guardType.name} is asynchronous. Menu visibility might not be immediately accurate.`);
          return false;
        }
        if (guardResult instanceof Promise) {
          console.warn(`Guard ${guardType.name} is asynchronous. Menu visibility might not be immediately accurate.`);
          return false;
        }

        if (guardResult === true) {
          continue;
        } else if (guardResult === false || guardResult instanceof UrlTree) {
          return false;
        }
      }
    }
    return true;
  }

  // canNavigateToRoute(route: Route) {
  //   if (!route.canActivate) return true
  //   for (let guard of route.canActivate) {
  //     let g = this.injector.get(guard) as CanActivate
  //     if (g && g.canActivate) {
  //       var r = new dummyRoute()
  //       r.routeConfig = route
  //       let canActivate = g.canActivate(r, undefined!)
  //       if (!canActivate) return false
  //     }
  //   }
  //   return true
  // }
}

export declare type AngularComponent = { new(...args: any[]): any }

// @dynamic
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(
    protected remult: Remult,
    private router: Router,
    private helper: RouteHelperService
  ) { }
  isAllowed(): Allowed {
    return true
  }
  static componentToNavigateIfNotAllowed: AngularComponent

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {

      // console.log('AuthenticatedGuard.canActivate', route.queryParams, JSON.stringify(route.queryParams))

    // console.log('AuthenticatedGuard.canActivate')

    if (
      this.remult.authenticated() &&
      this.remult.isAllowed(this.isAllowed())
    ) {
    // console.log('AuthenticatedGuard.canActivate TRUE')

      return true; // המשתמש מאומת ובעל הרשאות מתאימות
    }

    // המשתמש אינו מאומת או לא מורשה לתפקיד הנדרש
    if (!(route instanceof dummyRoute)) { // ודא ש-dummyRoute רלוונטי
      // **כאן אנו מעבירים את ה-Query Parameters**
      const queryParams = route.queryParams; // קבל את הפרמטרים מה-URL המקורי

      // ברירת המחדל תהיה ניתוב ללוגין עם הפרמטרים
      // אתה צריך להחליט לאן לנתב כשלא מאומת / לא מורשה.
      // ברוב המקרים, זה יהיה עמוד הלוגין.
      // console.log('queryParams', JSON.stringify(queryParams))
      const targetUrlTree = this.router.createUrlTree(['/login'], {
        queryParams: queryParams,
        queryParamsHandling: 'merge'
      });

      // אם יש לך `componentToNavigateIfNotAllowed` והוא לא ריק, אולי אתה רוצה לנתב לשם במקום לוגין.
      // במקרה כזה, יש לוודא שה-`helper.navigateToComponent` גם יודע לטפל ב-queryParams.
      // אם המטרה היא תמיד ללוגין כשלא מאומת/מורשה, אז `targetUrlTree` יספיק.
      // אם אתה משתמש ב-`this.helper.navigateToComponent(x)`, תצטרך לוודא שה-helper
      // מסוגל לשמר את ה-queryParams. אם לא, פשוט תחזיר את ה-targetUrlTree.

      return targetUrlTree; // החזר את ה-UrlTree כדי שה-Router יבצע את הניתוב מחדש
    }

    // אם זה dummyRoute או מקרה שלא טופל
    return false;
  }
  //   if (
  //     this.remult.authenticated() &&
  //     this.remult.isAllowed(this.isAllowed())
  //   ) {
  //     return true
  //   }

  //   if (!(route instanceof dummyRoute)) {
  //     let x = AuthenticatedGuard.componentToNavigateIfNotAllowed
  //     if (x != undefined) {
  //       this.helper.navigateToComponent(x)
  //     } else this.router.navigate(['/'])
  //   }
  //   return false
  // }
}

@Injectable()
export class NotAuthenticatedGuard implements CanActivate {
  constructor(private remult: Remult, private router: Router) { }
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // if (this.remult.authenticated()) return false

    // console.log('NotAuthenticatedGuard.canActivate TRUE')
    if (this.remult.authenticated()) {
    // console.log('NotAuthenticatedGuard.canActivate TRUE')
      // המשתמש מחובר, נתב אותו לדף המתאים לתפקידו
      // יש צורך לגשת למידע על המשתמש המחובר (לדוגמה, מ-remult.user)
      const userRoles = this.remult.user?.roles; // נניח ש-remult.user מכיל את תפקידי המשתמש

      if (userRoles?.includes('admin')) {
        return this.router.createUrlTree(['/admin']);
      } else if (userRoles?.includes('operator')) {
        return this.router.createUrlTree(['/operator']);
      } else if (userRoles?.includes('customer')) {
        return this.router.createUrlTree(['/client']);
      } else {
        // אם אין תפקיד ספציפי או תפקיד לא מוכר, נתב לדף ברירת מחדל
        return this.router.createUrlTree(['/']); // דף הבית
      }
    }
    return true
  }
}

class dummyRoute extends ActivatedRouteSnapshot {
  constructor() {
    super()
  }
  override routeConfig: any
}
