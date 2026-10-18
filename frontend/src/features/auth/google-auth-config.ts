/** Google OAuth web client id from env (safe in the browser). */
export function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function isGoogleSignInConfigured(): boolean {
  return googleClientId().length > 0;
}
