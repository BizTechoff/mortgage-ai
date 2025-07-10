import { Injectable } from '@angular/core'
import { AuthenticatedGuard } from 'common-ui-elements'
import { Roles } from '../../shared/enum/roles'

@Injectable()
export class AdminGuard extends AuthenticatedGuard {
  override isAllowed() {
    return Roles.admin
  }
}

@Injectable()
export class ManagerGuard extends AuthenticatedGuard {
  override isAllowed() {
    return Roles.manager
  }
}

@Injectable()
export class OperatorGuard extends AuthenticatedGuard {
  override isAllowed() {
    return Roles.operator
  }
}

@Injectable()
export class AdminOrManagerGuard extends AuthenticatedGuard {
  override isAllowed() {
    return [Roles.admin, Roles.manager]
  }
}

@Injectable()
export class AdminOrManagerOrOperatorGuard extends AuthenticatedGuard {
  override isAllowed() {
    return [Roles.admin, Roles.manager, Roles.operator]
  }
}


@Injectable()
export class CustomerGuard extends AuthenticatedGuard {
  override isAllowed() {
    return Roles.customer
  }
}
