import { Injectable, Logger } from "@nestjs/common";
import { EmailMessage, EmailPort } from "./email.port";

@Injectable()
export class NoopEmail implements EmailPort {
  private readonly log = new Logger(NoopEmail.name);

  async send(message: EmailMessage): Promise<void> {
    this.log.log(`[noop email] to=${message.to} subject=${message.subject}`);
    this.log.debug(message.text);
  }
}
