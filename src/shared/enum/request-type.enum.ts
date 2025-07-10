// src/shared/enums/request-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class RequestType {
  static new = new RequestType('new', 'משכנתה חדשה');
  static renew = new RequestType('renew', 'מחזור משכנתה');
  static loan = new RequestType('loan', 'הלוואה אישית');

  constructor(
    public id: string,
    public caption: string
  ) { }

  static getAllTypes(): RequestType[] {
    return Object.values(RequestType).filter(type =>
      type instanceof RequestType
    ) as RequestType[];
  }

  // Export labels object for backwards compatibility
  // export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  //   RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))


  static fromString(type: string): RequestType {
    var result = RequestType.new
    if (type) {
      // console.log('fromString: ' + type)
      const entries = Object.fromEntries(
        RequestType.getAllTypes().map(itm => [itm.id, itm]))
      if (entries[type]) {
        result = entries[type]
      }
    }
      // console.log('fromString.result: ' + JSON.stringify(result))
    return result
  }
}

export const RequestTypeLabels: Record<string, string> = {
  'new': 'משכנתה חדשה',
  'renew': 'מחזור משכנתה',
  'loan': 'הלוואה אישית'
};