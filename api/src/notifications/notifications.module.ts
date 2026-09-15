import { Global, Module } from "@nestjs/common";
import { EMAIL } from "./email.port";
import { NoopEmail } from "./noop.email";

@Global()
@Module({
  providers: [{ provide: EMAIL, useClass: NoopEmail }],
  exports: [EMAIL],
})
export class NotificationsModule {}
