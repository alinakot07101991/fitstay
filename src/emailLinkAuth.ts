import { sendSignInLinkToEmail } from "firebase/auth"
import { auth } from "./firebase"

export const emailForSignInKey = "fitstay.emailForSignIn"
export const pendingNameKey = "fitstay.pendingName"

export function getEmailLinkCallbackUrl() {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  return new URL("/auth/verify", appUrl).toString()
}

export async function sendMagicSignInLink(email: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase()
  await sendSignInLinkToEmail(auth, normalizedEmail, {
    url: getEmailLinkCallbackUrl(),
    handleCodeInApp: true,
  })
  window.localStorage.setItem(emailForSignInKey, normalizedEmail)
  return normalizedEmail
}
