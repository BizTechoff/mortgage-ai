// src/shared/enums/request-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class MaritalStatus {
  static married = new MaritalStatus('married', 'נשוי/אה');
  static single = new MaritalStatus('single', 'רווק/ה');
  static singleParent = new MaritalStatus('singleParent', 'הורה יחיד');
  static commonLaw = new MaritalStatus('commonLaw', 'ידועים בציבור');
  static divorced = new MaritalStatus('divorced', 'גרוש/ה');
  static other = new MaritalStatus('other', 'אחר');

  constructor(
    public id: string,
    public caption: string
  ) { }

  static getAllTypes(): MaritalStatus[] {
    return Object.values(MaritalStatus).filter(type =>
      type instanceof MaritalStatus
    ) as MaritalStatus[];
  }

  // Export labels object for backwards compatibility
  // export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  //   RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))


  static fromString(type: string): MaritalStatus {
    var result = MaritalStatus.other
    if (type) {
      // console.log('fromString: ' + type)
      const entries = Object.fromEntries(
        MaritalStatus.getAllTypes().map(itm => [itm.id, itm]))
      if (entries[type]) {
        result = entries[type]
      }
    }
    // console.log('fromString.result: ' + JSON.stringify(result))
    return result
  }
}
