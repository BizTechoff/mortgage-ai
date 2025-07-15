// src/shared/enums/request-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class RenewReason {
  static lowerRate = new RenewReason('lowerRate', 'הורדת ריבית');
  static lowerPayment = new RenewReason('lowerPayment', 'הקטנת תשלום חודשי');
  static additionalMoney = new RenewReason('additionalMoney', 'משיכת כספים נוספים');
  static trackChange = new RenewReason('trackChange', 'שינוי מסלול');
  static other = new RenewReason('other', 'אחר');

  constructor(
    public id: string,
    public caption: string
  ) { }

  static getAllTypes(): RenewReason[] {
    return Object.values(RenewReason).filter(type =>
      type instanceof RenewReason
    ) as RenewReason[];
  }

  // Export labels object for backwards compatibility
  // export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  //   RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))


  static fromString(type: string): RenewReason {
    var result = RenewReason.other
    if (type) {
      // console.log('fromString: ' + type)
      const entries = Object.fromEntries(
        RenewReason.getAllTypes().map(itm => [itm.id, itm]))
      if (entries[type]) {
        result = entries[type]
      }
    }
    // console.log('fromString.result: ' + JSON.stringify(result))
    return result
  }
}
