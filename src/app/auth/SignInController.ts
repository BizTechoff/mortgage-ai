
import type express from 'express'
import {
  Allow,
  BackendMethod,
  Controller,
  ControllerBase,
  Fields,
  remult,
  repo,
  UserInfo,
  Validators,
} from 'remult'
import { ServerWhatsAppServiceSender } from '../../server/service/server.whatsapp.service.sender'
import { User } from '../../shared/entity/user.entity'
import { Roles } from '../../shared/enum/roles'
import { WhatsAppResponse } from '../../shared/type/whatsapp.type'
import type from 'cookie-session'

declare module 'remult' {
  export interface RemultContext {
    request?: express.Request
  }
}

const isProduction = process.env['NODE_ENV'] === "production";

@Controller('signer')
export class SignInController extends ControllerBase {

  @Fields.string<SignInController>({
    caption: 'נייד',
    validate: Validators.required,
    valueConverter: {
      toDb: (x) => (x !== undefined ? x.replace(/-/g, '') : ''),  // Remove dashes before storing in DB
      fromDb: (x) => (x ? `${x.slice(0, 3)}-${x.slice(3, 6)}-${x.slice(6, 10)}` : '') // Format when reading from DB
    }
  })
  mobile = ''

  @Fields.string<SignInController>({
    caption: 'קוד אימות'
  })
  verifyCode = '';

  // @Fields.string({
  //   caption: terms.username,
  //   // validate: Validators.required,
  // })
  // user = ''

  // @Fields.string({
  //   caption: terms.password,
  //   // validate: Validators.required,
  //   inputType: 'password',
  // })
  // password = ''


  resetToDefaults() {
    this.mobile = ''
    this.verifyCode = '';
  }

  generateRandomCode(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min)
  }

  formatMobile() {
    var m = this.mobile + ''
    if (!m) {
      m = ''
    }

    if (m.startsWith('05')) {
      m = m.replace(/,/g, '').replace(/-/g, '')
      if (m.length === 10) {
        return m
      }
    }
    return ''
  }

  @BackendMethod({ allowed: true })
  /**
   * This sign mechanism represents a simplistic sign in management utility with the following behaviors
   * 1. The first user that signs in, is created as a user and is determined as admin.
   * 2. When a user that has no password signs in, that password that they've signed in with is set as the users password
   */
  async sendVerificationCode() {
    console.log('sendVerificationCode called')
    const result = { success: false, error: '' }
    //1. is email exsists
    const mobile = this.formatMobile()
    if (!mobile) {
      result.error = `נייד אינו תקין`
      return result
    }

    const userRepo = remult.repo(User)
    let u = await userRepo.findFirst({ mobile })
    if (!u) {
      if ((await userRepo.count()) === 0) {
        // first time ever, any user logging in.
        u = await userRepo.insert({
          mobile: mobile,
          name: 'אדמין',
          admin: true
        })
      }
      else {
        result.error = 'נייד לא קיים'
        return result
      }
    }

    if (u.disabled) {
      result.error = 'אינך מורשה לשימוש במערכת'
      return result
    }

    const code = this.generateRandomCode(555770, 999770)
    const message = `קוד אימות: *${code}*, תקף לחמש דקות בלבד.`
    const toMobile = isProduction
      ? mobile
      : process.env['ADMIN_MOBILE']!
    const chatId = `972${toMobile.slice(1)}@c.us`

    const wappResponse: WhatsAppResponse = isProduction
      ? await ServerWhatsAppServiceSender.sendMessage({
        mobile: toMobile, message: message
      })
      : { status: 'sent', idMessage: '', message: '' }

    if (wappResponse.status === 'sent') {
      u.verifyCode = code.toString()
      u.verifyTime = new Date()
      await u.save()
      result.success = true
    }

    return result
  }


  @BackendMethod({ allowed: true })
  /**
   * This sign mechanism represents a simplistic sign in management utility with the following behaviors
   * 1. The first user that signs in, is created as a user and is determined as admin.
   * 2. When a user that has no password signs in, that password that they've signed in with is set as the users password
   */
  async silentSignIn(token = '') {
    const mobile = ''
    const name = ''
    const code = ''
    // extract values from token
    // this.user = mobile
    this.mobile = mobile
    this.verifyCode = code
    return await this.signIn()
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static signOut() {
    setSessionUserBasedOnUserRow(undefined!)
  }

  @BackendMethod({ allowed: true })
  /**
   * This sign mechanism represents a simplistic sign in management utility with the following behaviors
   * 1. The first user that signs in, is created as a user and is determined as admin.
   * 2. When a user that has no password signs in, that password that they've signed in with is set as the users password
   */
  async signIn() {
    console.log('signIn called')
    let result: { success: boolean, userInfo: UserInfo, error: string } = { success: false, userInfo: undefined!, error: '' }

    const mobile = this.formatMobile()
    if (!mobile?.trim().length) {
      result.error = `נייד אינו תקין`
      return result
    }

    const userRepo = remult.repo(User)
    let u = await userRepo.findFirst({ mobile: mobile }, { useCache: false })
    if (!u) {
      result.error = `User NOT found at signing-in!`
      return result
    }

    let adminVerifyCode = process.env['ADMIN_VERIFY_CODE'] ?? ''
    // console.log('adminVerifyCode', adminVerifyCode)
    if (![u.verifyCode, adminVerifyCode].includes(this.verifyCode)) {
      result.error = `קוד אימות שגוי`
      console.log(u.verifyCode, adminVerifyCode)
      return result
    }

    if (this.verifyCode !== adminVerifyCode) {
      let validVerificationCodeResponseMinutes = 5 //min
      let now = new Date();
      let minValidTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes() - validVerificationCodeResponseMinutes);
      console.log('valid', u.verifyTime, minValidTime, u.verifyTime < minValidTime)
      if (u.verifyTime < minValidTime) {
        result.error = 'קוד זה כבר אינו בתוקף'
        return result
      }
    }

    const ui = await setSessionUserBasedOnUserRow(u)
    if (ui) {
      result.success = true
      result.userInfo = ui

      // remult.user = ui
    }
    else {
      result.error = 'UnKnown error has occured'
    }
    return result
  }
}

export async function setSessionUserBasedOnUserRow(user?: User) {
  if (!user) {
    if (remult.context.request?.session) {
      remult.context.request.session['user'] = undefined!
    }
    return undefined
  }
  const roles = [] as string[]

  if (user.admin) {
    roles.push(Roles.admin)
  }
  else if (user.manager) {
    roles.push(Roles.manager)
  }
  else if (user.operator) {
    roles.push(Roles.operator)
  }
  else if (user.customer) {
    roles.push(Roles.customer)
  }
  const userInfo: UserInfo = { id: user.id, name: user.name, roles }
  if (remult.context.request && remult.context.request.session) {
    const current = remult.context.request.session['user']
    if (JSON.stringify(userInfo) != JSON.stringify(current))
      remult.context.request.session['user'] = userInfo
  }
  return userInfo
}

export async function getUser(req: express.Request) {
  const sessionUser = req.session?.['user']
  if (!sessionUser || !sessionUser.id) return
  const user = await repo(User).findFirst({
    id: sessionUser!.id,
    disabled: false
  })
  return await setSessionUserBasedOnUserRow(user)
}
