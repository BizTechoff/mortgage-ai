// src/shared/enums/request-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class Bank {
  static poalim = new Bank('poalim', 'בנק הפועלים');
  static leumi = new Bank('leumi', 'בנק לאומי');
  static mizrahi = new Bank('mizrahi', 'בנק מזרחי טפחות');
  static discount = new Bank('discount', 'בנק דיסקונט');
  static benleumi = new Bank('benleumi', 'בנק הבינלאומי');
  static other = new Bank('other', 'אחר');

  constructor(
    public id: string,
    public caption: string
  ) { }

  static getAllTypes(): Bank[] {
    return Object.values(Bank).filter(type =>
      type instanceof Bank
    ) as Bank[];
  }

  // Export labels object for backwards compatibility
  // export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  //   RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))


  static fromString(type: string): Bank {
    var result = Bank.other
    if (type) {
      // console.log('fromString: ' + type)
      const entries = Object.fromEntries(
        Bank.getAllTypes().map(itm => [itm.id, itm]))
      if (entries[type]) {
        result = entries[type]
      }
    }
    // console.log('fromString.result: ' + JSON.stringify(result))
    return result
  }
}
