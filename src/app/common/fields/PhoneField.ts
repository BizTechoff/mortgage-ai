import {
  FieldRef,
  Fields,
  StringFieldOptions,
  type FieldValidator,
} from 'remult'

export function OnlyAllowIsraeliPhones(_: any, ref: FieldRef<any, string>) {
  if (ref.value.startsWith('+')) throw Error('רק טלפונים ישראלים נתמכים כרגע')
}

export function whatsappUrl(phone: string, smsMessage: string) {
  phone = fixPhoneInput(phone)
  if (phone.startsWith('0')) {
    phone = `+972` + phone.substring(1)
  }

  if (phone.startsWith('+')) phone = phone.substring(1)

  return 'https://wa.me/' + phone + '?text=' + encodeURI(smsMessage)
}

export function sendWhatsappToPhone(phone: string, smsMessage: string) {
  window.open(whatsappUrl(phone, smsMessage), '_blank')
}

export function fixPhoneOutput(s: string | number | null | undefined): string {
  if (s === null || s === undefined || s === '') {
    return ''; // Return empty string for null, undefined, or empty input
  }

  let cleaned = s.toString().replace(/\D/g, ''); // Remove all non-digit characters

  // Assuming the input is expected to be a 10-digit Israeli mobile number starting with '05'
  if (cleaned.length === 10 && cleaned.startsWith('05')) {
    // Apply the desired display mask: 050-1234567
    return cleaned.substring(0, 3) + '-' + cleaned.substring(3, 10);
  }

  // If it's not a 10-digit number starting with '05', return it as cleaned digits.
  // This means it might be an invalid internal number, or another format you need to handle.
  return cleaned;
}

export function fixPhoneInput(s: string): string {

  // Declare 'orig' at the beginning of the function scope
  let orig = ''

  if (!s || !s.trim().length) return orig; // If input is empty or null, return as is.

  let processed = s.toString().replace(/\D/g, ''); // Remove all non-digit characters

  // Handle international prefix +972
  if (processed.startsWith('972')) {
    processed = processed.substring(3); // Remove '972'
  } else if (processed.startsWith('0')) {
    processed = processed.substring(1); // Remove leading '0' for internal consistency, will add back later
  }

  // Ensure it's 9 digits before adding '05' prefix
  // This implies we are only handling mobile numbers that should start with '05'
  // If a number like '31234567' (a 03 prefix number without the 0) comes in, this would incorrectly add '05'
  // This logic assumes that if it's 9 digits and not starting with 0, it's an Israeli mobile number without the 0.
  // It's crucial to clarify if landlines or other prefixes need different handling.
  if (processed.length === 9) {
    // Check if it's an Israeli mobile number (starting with 5 after the initial 0)
    // This is a common pattern for 05x numbers after removing the leading 0
    if (processed.startsWith('5')) {
      processed = '0' + processed; // Add the leading '0' back
    } else {
      // If it's 9 digits but doesn't start with 5 (e.g., 31234567 for 03),
      // we might need more complex logic or reject it if it must be a mobile.
      // For now, if it's 9 digits and doesn't start with 5, assume it's incomplete or invalid for this format.
      // Or if it's a landline number without the leading zero (e.g. 31234567 for 03-...)
      // For this function's explicit goal (05x number), we'll try to convert.
      // A more robust solution might return an error or null if it's not a valid mobile.
      // Let's assume it should become a 05X number if it's 9 digits and not 05X yet.
      // This part might need further refinement based on exact business rules for non-05 numbers.
      // For *strictly* 0501234567 format:
      // If it's 9 digits, it *must* be 5XXXXXXXX
      // If it's 10 digits, it *must* be 05XXXXXXXX
      if (processed.length === 9 && processed[0] === '5') {
          processed = '0' + processed; // Ensure 05XXXXXXXX format
      } else {
          // If it's 9 digits and not starting with 5 (e.g., landline portion), or 10 digits but not 05X
          // and we specifically need 0501234567 format.
          // This case implies we cannot simply force it into 05X format.
          // Returning original string or throwing error might be better here based on strictness.
          return orig; // Cannot conform to 05XXXXXXXX pattern if it's not starting with 05.
      }
  }


  } else if (processed.length === 10 && processed.startsWith('05')) {
    // Already in 0501234567 format, good.
  } else {
    // If it's not 9 digits, and not 10 digits starting with 05,
    // it's not in the desired format.
    // Return original or throw error based on how strict you want this to be.
    return orig; // Return original if it doesn't match expected patterns.
  }

  return processed;
}

// export function fixPhoneInput(s: string) {
//   if (!s) return s
//   let orig = s.toString().trim()
//   s = s.toString().replace(/\D/g, '')
//   if (s.startsWith('972')) s = s.substring(3)
//   else if (orig.startsWith('+')) return '+' + s
//   if (s.length == 9 && s[0] != '0' && s[0] != '3') s = '0' + s
//   return s
// }

export function isPhoneValidForIsrael(input: string) {
  if (input) {
    input = input.toString().trim()
    if (input.startsWith('+')) return true
    let st1 = input.match(/^0(5\d|7\d|[1,2,3,4,6,8,9])(-{0,1}\d{3})(-*\d{4})$/)
    return st1 != null
  }
  return false
}
export const phoneConfig = {
  disableValidation: false,
}
export function PhoneField<entityType>(
  options?: StringFieldOptions<entityType>
) {
  const validate: FieldValidator<entityType, string>[] = [
    (_, f) => {
      if (!f.value) return
      f.value = fixPhoneInput(f.value)
      if (phoneConfig.disableValidation) return
      if (!isPhoneValidForIsrael(f.value)) {
        throw new Error('טלפון לא תקין')
      }
    },
  ]
  if (options?.validate) {
    if (!Array.isArray(options.validate)) options.validate = [options.validate]
    validate.push(...options.validate)
  }
  return Fields.string({
    caption: 'מספר טלפון',
    inputType: 'tel',
    displayValue: (_, value) => formatPhone(value),
    ...options,
    validate,
  })
}

export function formatPhone(s: string) {
  if (!s) return s
  let x = s.replace(/\D/g, '')
  if (x.length < 9 || x.length > 10) return s
  if (x.length < 10 && !x.startsWith('0')) x = '0' + x

  x = x.substring(0, x.length - 4) + '-' + x.substring(x.length - 4, x.length)
  x = x.substring(0, x.length - 8) + '-' + x.substring(x.length - 8, x.length)
  return x
}

export interface ContactInfo {
  phone: string
  formattedPhone: string
  name: string
}
export interface TaskContactInfo {
  origin: ContactInfo[]
  target: ContactInfo[]
}
