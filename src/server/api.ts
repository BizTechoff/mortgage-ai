import { createPostgresConnection } from 'remult/postgres'
import { remultExpress } from 'remult/remult-express'
import { SignInController, getUser } from '../app/auth/SignInController'
import { UpdatePasswordController } from '../app/auth/UpdatePasswordController'
import { AppointmentController } from '../shared/controller/appointment.controller'
import { DocumentController } from '../shared/controller/document.controller'
import { OperatorController } from '../shared/controller/operator.controller'
import { RequestController } from '../shared/controller/request.controller'
import { UserController } from '../shared/controller/user.controller'
import { ChangeLog } from '../shared/entity/change-log.entity'
import { WhatsAppConversation } from '../shared/entity/conversation.entity'
import { Document } from '../shared/entity/document.entity'
import { MortgageRequestStage } from '../shared/entity/request-stage.entity'
import { MortgageRequest } from '../shared/entity/request.entity'
import { Stage } from '../shared/entity/stage.entity'
import { User } from '../shared/entity/user.entity'
import { seendStages } from './seed'
import { CalendarController } from '../shared/controller/calendar.controller'
import { SnpvController } from '../shared/controller/snpv.controller'

export const entities = [User, WhatsAppConversation, ChangeLog, MortgageRequest, Document, Stage, MortgageRequestStage]
export const controllers = [SignInController, UpdatePasswordController, RequestController,
  UserController, OperatorController, RequestController, AppointmentController, DocumentController, CalendarController, SnpvController]

export const api = remultExpress({
  admin: () => true,// remult.isAllowed(Roles.admin),
  controllers: controllers,
  entities: entities,
  getUser,
  // initApi: async r => await seendStages(r),
  dataProvider: async () => {
    const STARTING_REQUEST_NUM = 1001;
    const provider = await createPostgresConnection({ configuration: "heroku", sslInDev: !(process.env['NODE_ENV'] === 'development') })

    /*
              let seq = `
              CREATE SEQUENCE IF NOT EXISTS public.request_requestNumber_seq
              INCREMENT 1
              START 1001
              MINVALUE 1001
              MAXVALUE 2147483647
              CACHE 1
              OWNED BY request.requestNumber;
          `
      
              // findorcreate requestNumber serial restart at 1ber001.
              await provider.execute('alter table request add column if not exists "requestNumber" serial');
              let result = await provider.execute('SELECT last_value FROM "request_requestNumber_seq"');
              if (result && result.rows && result.rows.length > 0) {
                  let count = parseInt(result.rows[0].last_value);
                  console.log('', count)
                  if (count < STARTING_REQUEST_NUM) {
                      await provider.execute(`SELECT setval('"request_requestNumber_seq"'::regclass, ${STARTING_REQUEST_NUM}, false)`);
                  }
              }
  */

    // if (process.env['NODE_ENV'] === "production")
    return provider
    // return undefined;
  }
})
