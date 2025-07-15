// src/shared/enums/request-type.enum.ts
import { ValueListFieldType } from 'remult';

@ValueListFieldType()
export class EmploymentType {
  static salaried = new EmploymentType('salaried', 'שכיר', 'שכירה');
  static selfEmployed = new EmploymentType('selfEmployed', 'עצמאי', 'עצמאית');
  static other = new EmploymentType('other', 'אחר', 'אחר');

  constructor(
    public id: string,
    public caption: string,
    public female: string
  ) { }

  static getAllTypes(): EmploymentType[] {
    return Object.values(EmploymentType).filter(type =>
      type instanceof EmploymentType
    ) as EmploymentType[];
  }

  // Export labels object for backwards compatibility
  // export const RequestStatusLabels: Record<string, string> = Object.fromEntries(
  //   RequestStatus.getAllStatuses().map(status => [status.id, status.caption]))


  static fromString(type: string): EmploymentType {
    var result = EmploymentType.other
    if (type) {
      // console.log('fromString: ' + type)
      const entries = Object.fromEntries(
        EmploymentType.getAllTypes().map(itm => [itm.id, itm]))
      if (entries[type]) {
        result = entries[type]
      }
    }
    // console.log('fromString.result: ' + JSON.stringify(result))
    return result
  }
}
