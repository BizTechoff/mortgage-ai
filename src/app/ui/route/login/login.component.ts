// src/app/login/login.component.2.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { remult, UserInfo } from 'remult';
import { UIToolsService } from 'src/app/common/UIToolsService';
import { Roles } from 'src/shared/enum/roles';
import { SignInController } from '../../../auth/SignInController';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  signer = new SignInController();
  isLoading: boolean = false;
  magicToken: string | null = null;
  returnUrl: string | null = null;

  loginStep: 'initial' | 'codeVerification' | 'processingMagicLink' = 'initial';
  maskedMobile: string = '';

  // New property for resend code timer
  resendCooldownSeconds: number = 60; // Cooldown duration
  resendTimer: any;
  resendCountdown: number = 0;
  canResendCode: boolean = true;
  private originalRouteQueryParams: { [key: string]: any } = {}; // אובייקט לשמירת הפרמטרים


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private uiService: UIToolsService
  ) {
    this.loginForm = this.fb.group({
      // username: ['', Validators.required],
      mobile: ['', [
        Validators.required,
        Validators.pattern(/^\d{3}-\d{7}$/) //(/^(05[0-9]{8}|0(?:[2-46-9]|5[0-9])[0-9]{7})$/)
      ]],
      verificationCode: ['']//, Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  isAdmin = () => remult.isAllowed(Roles.admin);
  isManager = () => remult.isAllowed(Roles.manager);
  isOperator = () => remult.isAllowed(Roles.operator);
  isClient = () => remult.isAllowed(Roles.customer);
  apply = (ui: UserInfo) => remult.user = ui

  ngOnInit(): void {
    console.log('LoginComponent: ' + this.router.url)

    // alert(remult.authenticated())
    this.route.queryParams.subscribe(params => {

      console.log('LOGIN: ' + this.router.url)
      this.originalRouteQueryParams = { ...params }; // העתקה של הפרמטרים

      this.magicToken = params['token'] || null;
      this.returnUrl = params['returnUrl'] || null;

      const prefillUsername = params['username'] || null;
      const prefillMobile = params['mobile'] || null;

      if (prefillUsername) {
        this.f['username'].setValue(prefillUsername);
      }
      if (prefillMobile) {
        this.f['mobile'].setValue(this.setMobileAsMask(prefillMobile));
      }

      if (this.magicToken) {
        this.loginStep = 'processingMagicLink';
        this.performMagicLogin();
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid && this.loginStep === 'initial') {
      this.uiService.error('אנא מלא את שם המשתמש והנייד.');
      return;
    }
    if (this.loginForm.invalid && this.loginStep === 'codeVerification' && this.f['verificationCode'].invalid) {
      this.uiService.error('אנא הזן את קוד האימות.');
      return;
    }

    if (this.loginStep === 'initial') {
      await this.sendVerificationCode();
    } else if (this.loginStep === 'codeVerification') {
      await this.signInWithCode();
    }
  }

  setMobileAsMask(mobile = '') {
    if (!mobile || !(mobile.length > 3)) {
      return ''
    }

    let value = mobile.replace(/\D/g, ''); // Remove all non-digit characters

    // Apply the mask: 000-0000000
    if (value.length > 3) {
      value = value.substring(0, 3) + '-' + value.substring(3, 10); // Max 10 digits total
    }

    return value
  }

  /**
    * Handles mobile input formatting to enforce 000-0000000 mask.
    * @param event The input event.
    */
  onMobileInput(event: Event): void { // <--- FIX: Explicitly type 'event' as Event
    const input = event.target as HTMLInputElement; // <--- FIX: Type assertion for input

    // Update the input field
    input.value = this.setMobileAsMask(input.value);

    // Update the form control with the formatted value
    // Use setValue with emitEvent: false to prevent infinite loops if validator also triggers input event
    this.loginForm.get('mobile')?.setValue(input.value, { emitEvent: false });
    this.loginForm.get('mobile')?.updateValueAndValidity(); // Manually trigger validation
  }

  /**
   * Step 1: Sends a verification code to the provided mobile number.
   * Sets signer.user and signer.mobile before calling sendVerificationCode.
   */
  private async sendVerificationCode(): Promise<void> {
    this.isLoading = true;
    try {
      const { username, mobile } = this.loginForm.value;
      // console.log('this.loginForm.value', this.loginForm.value)
      // הגדרת מאפייני ה-signer ישירות - אלו ישמרו עבור קריאת signIn הבאה
      // this.signer.user = username;
      this.signer.mobile = mobile;

      // קריאה למתודה sendVerificationCode ללא ארגומנטים
      const result = await this.signer.sendVerificationCode();
      // result.success = true
      if (result.success) {
        this.uiService.info(`קוד אימות נשלח לווטסאפ שלך במספר ${mobile}. אנא הזן אותו.`);
        this.maskedMobile = this.maskMobileNumber(mobile);
        this.loginStep = 'codeVerification'; // Advance to code verification step
        this.f['verificationCode'].setValidators(Validators.required);
        this.f['verificationCode'].updateValueAndValidity(); // Re-evaluate validation
        this.startResendCooldown(); // Start cooldown timer
      } else {
        this.uiService.error(result.error || 'שגיאה בשליחת קוד האימות. אנא ודא את פרטי המשתמש ונסה שוב.');
      }
    } catch (error: any) {
      this.uiService.error(`שגיאה בשליחת קוד אימות: ${error.message || 'נסה שוב מאוחר יותר.'}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Step 2: Attempts to sign in using the verification code.
   * Assumes signer.user and signer.mobile are already set from sendVerificationCode.
   */
  private async signInWithCode(): Promise<void> {
    this.isLoading = true;
    try {
      const { verificationCode } = this.loginForm.value;
      console.log('verificationCode', verificationCode)
      // הגדרת מאפיין verifyCode ב-signer ישירות
      this.signer.verifyCode = verificationCode; // זהו השינוי העיקרי שביקשת

      // קריאה למתודה signIn ללא ארגומנטים
      const result = await this.signer.signIn();

      if (result.success) {

        remult.user = result.userInfo
        this.uiService.info('התחברת בהצלחה!');

        this.onSignInSuccess()
      } else {
        this.uiService.error(result.error || 'קוד אימות שגוי או פג תוקף. אנא נסה שוב.');
        this.f['verificationCode'].setValue(''); // Clear the code field on error
      }
    } catch (error: any) {
      this.uiService.error(`שגיאה בהתחברות: ${error.message || 'נסה שוב מאוחר יותר.'}`);
    } finally {
      this.isLoading = false;
    }
  }

  // ... המשך הקוד בתוך LoginComponent

  async onSignInSuccess() {
    // 1. בצע את קריאת ה-BackendMethod להתחברות
    // לדוגמה: const result = await this.signInController.signIn(); // (או איך שאתה מבצע את האימות)

    // 2. ודא שההתחברות הצליחה והמשתמש מאומת
    if (remult.user) { // Remult מעדכן אוטומטית את remult.user לאחר הצלחה של BackendMethod
      const userRoles = remult.user.roles;

      // 3. בדוק אם ישנם פרמטרים שמורים מניתוב קודם
      if (Object.keys(this.originalRouteQueryParams).length > 0) {
        // **לוגיקת ניתוב חכם חזרה לנתיב המקורי:**
        // כאן אתה מחליט לאן לנתב בהתבסס על הפרמטרים ועל תפקיד המשתמש החדש המאומת.
        // זה מונע מלקוח להתחבר ואז להיות מופנה בטעות לדף אדמין שהיה בלינק.

        // דוגמה: אם היו פרמטרים של 'type' ו-'mobile' והמשתמש הוא 'customer'
        if (this.originalRouteQueryParams['type'] && this.originalRouteQueryParams['mobile'] && userRoles?.includes('customer')) {
          console.log('Redirecting to /client with original query params.');
          this.router.navigate(['/client'], { queryParams: this.originalRouteQueryParams });
          return; // סיום הניתוב
        }
        // דוגמה: אם היו פרמטרים של 'reportId' (מקורית מ-/admin) והמשתמש הוא 'admin'
        else if (this.originalRouteQueryParams['reportId'] && userRoles?.includes('admin')) {
          console.log('Redirecting to /admin with original query params.');
          this.router.navigate(['/admin'], { queryParams: this.originalRouteQueryParams });
          return; // סיום הניתוב
        }
        // ... הוסף תנאים דומים עבור 'operator' או כל נתיב אחר שצריך לשמר פרמטרים.

        // אם היו פרמטרים אבל לא התאימו לכלל ניתוב חכם או לתפקיד
        console.warn('Login: Query parameters found but no specific redirect rule matched or role mismatch. Redirecting based on role.');
      }

      // 4. אם לא נותבנו חזרה לנתיב המקורי (או שלא היו פרמטרים), נתב לפי התפקיד בלבד
      if (userRoles?.includes('admin')) {
        this.router.navigate(['/admin']);
      } else if (userRoles?.includes('operator')) {
        this.router.navigate(['/operator']);
      } else if (userRoles?.includes('customer')) {
        this.router.navigate(['/client']);
      } else {
        this.router.navigate(['/']); // ברירת מחדל לדף הבית
      }
    } else {
      // טיפול במקרה של כשל בהתחברות או משתמש לא מוגדר
      console.error('Login failed or user not set.');
      // אפשר להציג הודעת שגיאה למשתמש
    }
  }

  /**
   * Allows the user to request a new verification code after a cooldown period.
   * Reuses the sendVerificationCode logic.
   */
  async resendVerificationCode(): Promise<void> {
    if (!this.canResendCode) {
      this.uiService.error(`אנא המתן ${this.resendCountdown} שניות לפני שליחה חוזרת.`);
      return;
    }

    this.uiService.info('מבקש קוד אימות חדש...');
    // Reset the verification code field when resending
    this.f['verificationCode'].setValue('');
    await this.sendVerificationCode(); // Re-use the existing logic to send the code
  }

  private startResendCooldown(): void {
    this.canResendCode = false;
    this.resendCountdown = this.resendCooldownSeconds;
    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(this.resendTimer);
        this.canResendCode = true;
      }
    }, 1000);
  }

  /**
   * Attempts to log in using a magic token (from URL query params).
   */
  private async performMagicLogin(): Promise<void> {
    this.isLoading = true;
    try {
      const result = await this.signer.silentSignIn(this.magicToken!);

      if (result.success) {
        this.uiService.info('התחברת בהצלחה באמצעות קישור.');
        this.onSignInSuccess()
      } else {
        this.uiService.error(result.error || 'קישור ההתחברות אינו תקין או פג תוקף. אנא התחבר ידנית.');
        this.magicToken = null;
        this.loginStep = 'initial';
      }
    } catch (error: any) {
      this.uiService.error(`שגיאה בהתחברות אוטומטית: ${error.message || 'נסה שוב מאוחר יותר.'}`);
      this.magicToken = null;
      this.loginStep = 'initial';
    } finally {
      this.isLoading = false;
    }
  }

  private maskMobileNumber(mobile: string): string {
    if (!mobile || mobile.length < 4) return mobile;
    const firstTwo = mobile.substring(0, 2);
    const lastThree = mobile.substring(mobile.length - 3);
    const maskedPart = 'X'.repeat(mobile.length - 5);
    return `${firstTwo}-${maskedPart}-${lastThree}`;
  }

  // Lifecycle hook to clear timer if component is destroyed
  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }
}