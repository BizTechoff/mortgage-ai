import { Component, OnInit } from '@angular/core'

import { UIToolsService } from '../../../common/UIToolsService'

import { GridSettings } from 'common-ui-elements/interfaces'
import { remult } from 'remult'
import { User } from '../../../../shared/entity/user.entity'
import { Roles } from '../../../../shared/enum/roles'
import { BusyService } from '../../../common-ui-elements'
import { saveToExcel } from '../../../common-ui-elements/interfaces/src/saveGridToExcel'

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  constructor(private ui: UIToolsService, private busyService: BusyService) { }
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }

  users: GridSettings<User> = new GridSettings<User>(remult.repo(User), {
    allowDelete: false,
    allowInsert: true,
    allowUpdate: true,
    columnOrderStateKey: 'users',

    // orderBy: { name: 'asc' },
    rowsInPage: 100,

    columnSettings: (user) => [user.name, user.mobile, user.admin, user.operator, user.customer, user.disabled],
    rowCssClass: (row) => (row.disabled ? 'canceled' : ''),
    gridButtons: [
      {
        name: 'Excel',
        click: () => saveToExcel(this.users, 'users', this.busyService),
      },
    ],
    rowButtons: [
      // {
      //   name: terms.resetPassword,
      //   click: async () => {
      //     if (
      //       await this.ui.yesNoQuestion(
      //         terms.passwordDeleteConfirmOf + ' ' + this.users.currentRow.name
      //       )
      //     ) {
      //       await this.users.currentRow.resetPassword()
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
