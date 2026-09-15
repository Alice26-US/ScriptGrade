export const EMAIL = Symbol("EMAIL");

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailPort {
  send(message: EmailMessage): Promise<void>;
}
