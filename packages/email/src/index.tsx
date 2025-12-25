export const name = "email";

export { sendEmail } from "./sendEmail";
export {
  sendDigestEmail,
  sendCardChangeEmail,
  type DigestCard,
  type DigestEmailData,
  type CardChangeEmailData,
} from "./sendNotificationEmail";
