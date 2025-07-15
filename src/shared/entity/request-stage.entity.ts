import { Entity, Field, Fields, IdEntity } from "remult";
import { MortgageRequest } from "./request.entity";
import { Stage } from "./stage.entity";

@Entity<MortgageRequestStage>('request_stage', { caption: 'שלבי בקשה', allowApiCrud: true })
export class MortgageRequestStage extends IdEntity {

  @Field<MortgageRequestStage, MortgageRequest>(() => MortgageRequest, { caption: 'בקשה' })
  request!: MortgageRequest

  @Field<MortgageRequestStage, Stage>(() => Stage, { caption: 'שלב' })
  stage!: Stage


  @Fields.date<MortgageRequestStage>({ caption: 'זמן התחלה' })
  started!: Date

  @Fields.dateOnly<MortgageRequestStage>({ caption: 'שלב אחרון לביצוע' })
  untill!: Date

  @Fields.dateOnly<MortgageRequestStage>({ caption: 'תאריך אחרון להעברת הכסף' })
  transfer!: Date

  @Fields.date<MortgageRequestStage>({ caption: 'זמן סיום' })
  done!: Date

  @Fields.string({ caption: 'הערות שלב' }) // <<< חדש: שדה להערות
  notes?: string;

  @Fields.createdAt({ caption: 'נוצר ב' })
  created = new Date()

}
