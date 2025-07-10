import {
  Entity,
  Fields,
  IdEntity,
  Validators,
  remult
} from 'remult'
import { DataControl } from '../../app/common-ui-elements/interfaces'
import { dateFormatFull } from '../../app/common/dateFunc'
import { EmailField } from '../../app/common/fields/EmailField'
import { PhoneField } from '../../app/common/fields/PhoneField'
import { terms } from '../config/terms'
import { Roles } from '../enum/roles'

@Entity<User>('user', {
  caption: 'משתמשים',
  allowApiCrud: true,
  // allowApiRead: Allow.authenticated,
  // allowApiUpdate: Allow.authenticated,
  // allowApiDelete: false,
  // allowApiInsert: Roles.admin,
  // apiPrefilter: () =>
  //   remult.isAllowed([Roles.admin, Roles.manager])
  //     ? {}
  //     : remult.isAllowed([Roles.operator])
  //       ? { customer: true }
  //       : { id: [remult.user?.id!] },
    // apiPrefilter: () =>
    // !remult.isAllowed(Roles.admin) ? { id: [remult.user?.id!] } : {},
  defaultOrderBy: { admin: 'desc', manager: 'desc', operator: 'desc', customer: 'desc', name: 'asc' }
})
export class User extends IdEntity {

  @Fields.string({
    validate: [Validators.required],
    caption: terms.username,
  })
  name = ''

  @PhoneField<User>({
    caption: terms.mobile,
    validate: [Validators.required, Validators.unique],
  })
  mobile = ''

  @EmailField<User>({
    caption: terms.email
    // validate: [Validators.unique],
  })
  email = ''

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col?.value) {
        row.manager = false
        row.operator = false
        row.customer = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.admin
  })
  admin = false

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col?.value) {
        row.admin = false
        row.operator = false
        row.customer = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.manager
  })
  manager = false

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col?.value) {
        row.admin = false
        row.manager = false
        row.customer = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: 'מתפעלת'
  })
  operator = false

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col?.value) {
        row.admin = false
        row.manager = false
        row.operator = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.customer
  })
  customer = false

  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.disabled,
  })
  disabled = false


  @Fields.boolean({
    caption: "הסרה מרשימת תפוצה"
  })
  optOut = false;

  @Fields.object({
    caption: "הגדרות",
    allowNull: true
  })
  settings?: {
    notificationsEnabled?: boolean;
    language?: string;
    theme?: string;
  };

  @Fields.string({
    caption: "מספר בקשות בטיפול"
  })
  activeRequestsCount = "0";

  @Fields.string<User>({
    caption: 'קוד אימות',
    allowApiUpdate: false
  })
  verifyCode: string = ''

  @Fields.date<User>({
    caption: 'שליחת אימות',
    allowApiUpdate: false,
    displayValue: (row, col) => dateFormatFull(col)
  })
  verifyTime!: Date

  @Fields.createdAt({
    allowApiUpdate: false,
  })
  createdAt = new Date()

  @Fields.updatedAt({
    allowApiUpdate: false,
  })
  updatedAt = new Date()

  // async hashAndSetPassword(password: string) {
  //   this.password = (await import('password-hash')).generate(password)
  // }
  // async passwordMatches(password: string) {
  //   return (
  //     !this.password ||
  //     (await import('password-hash')).verify(password, this.password)
  //   )
  // }
  // @BackendMethod({ allowed: Roles.admin })
  // async resetPassword() {
  //   this.password = '1234'
  //   await this.hashAndSetPassword(this.password)
  //   await this.save()
  // }
}
