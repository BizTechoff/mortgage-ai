// src/shared/enums/request-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class YesNo {
  static yes = new YesNo('yes', 'כן');
  static no = new YesNo('no', 'לא');

  constructor(
    public id: string,
    public caption: string
  ) { }

  static getAllTypes(): YesNo[] {
    return Object.values(YesNo).filter(type =>
      type instanceof YesNo
    ) as YesNo[];
  }

  // Export labels object for backwards compatibility
  // export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  //   RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))


  static fromString(type: string): YesNo {
    var result = YesNo.no
    if (type) {
      // console.log('fromString: ' + type)
      const entries = Object.fromEntries(
        YesNo.getAllTypes().map(itm => [itm.id, itm]))
      if (entries[type]) {
        result = entries[type]
      }
    }
    // console.log('fromString.result: ' + JSON.stringify(result))
    return result
  }
}
