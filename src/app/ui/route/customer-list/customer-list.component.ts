import { Component } from '@angular/core'

import { UIToolsService } from '../../../common/UIToolsService'

import { GridSettings } from 'common-ui-elements/interfaces'
import { remult } from 'remult'
import { User } from '../../../../shared/entity/user.entity'
import { Roles } from '../../../../shared/enum/roles'
import { BusyService } from '../../../common-ui-elements'
import { saveToExcel } from '../../../common-ui-elements/interfaces/src/saveGridToExcel'

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent {
  constructor(private ui: UIToolsService, private busyService: BusyService) { }
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }

  customers: GridSettings<User> = new GridSettings<User>(remult.repo(User), {
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    columnOrderStateKey: 'customers',

    // orderBy: { name: 'asc' },
    rowsInPage: 100,

    where: {
      customer: true,
      disabled: false
    },
    columnSettings: (user) => [user.name, user.mobile, user.email, user.verifyCode, user.verifyTime, user.activeRequestsCount, user.optOut, user.settings, user.createdAt, user.updatedAt],
    rowCssClass: (row) => (row.disabled ? 'canceled' : ''),
    gridButtons: [
      {
        name: 'Excel',
        click: () => saveToExcel(this.customers, 'customers', this.busyService),
      },
    ],
    rowButtons: [
      // {
      //   name: terms.resetPassword,
      //   click: async () => {
      //     if (
      //       await this.ui.yesNoQuestion(
      //         terms.passwordDeleteConfirmOf + ' ' + this.customers.currentRow.name
      //       )
      //     ) {
      //       await this.customers.currentRow.resetPassword()
      //       this.ui.info(terms.passwordDeletedSuccessful)
      //     }
      //   },
      // },
    ],
    confirmDelete: async (h) => {
      return await this.ui.confirmDelete(h.name)
    },
  })

  ngOnInit() { }
}
