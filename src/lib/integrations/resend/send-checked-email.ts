import type { CreateEmailOptions, Resend } from "resend";

/** A resolved provider promise is not necessarily an accepted email. */
export async function sendCheckedEmail(client: Resend, options: CreateEmailOptions) {
  const result = await client.emails.send(options);
  if (result.error) {
    throw new Error(`Email provider rejected send: ${result.error.name}`);
  }
  if (!result.data?.id) throw new Error("Email provider did not confirm acceptance");
  return result;
}
