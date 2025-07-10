import { Entity, Field, Fields, IdEntity } from "remult";
import { RequestType } from "../enum/request-type.enum";

@Entity<Stage>('stage', { caption: 'שלב' })
export class Stage extends IdEntity {

    @Field<Stage, RequestType>(() => RequestType, { caption: 'סוג בקשה' })
    requestType!: RequestType

    // @Field<Stage, StageType>(() => StageType, { caption: 'סוג שלב' })
    // stageType!: StageType

    @Fields.string<Stage>({ caption: 'תיאור השלב' })
    desc = ''

    @Fields.number<Stage>({ caption: 'סדר מיון' })
    seq = 0

    @Fields.number<Stage>({ caption: 'משך בימים' })
    days = 0

}
