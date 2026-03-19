import { Resend } from "resend";

import { getResendEnv } from "@/lib/env";

let resendClient: Resend | null = null;

export function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(getResendEnv().RESEND_API_KEY);
  }

  return resendClient;
}
