// mac-auth login from the SPA, implementing the Better Auth flow documented in
// mac-auth's INTEGRATION.md:
//   1. POST /api/auth/sign-in/social { provider, callbackURL } → { url }; redirect.
//   2. Provider auth → redirected back to callbackURL with a session cookie
//      scoped to .monashcoding.com.
//   3. GET /api/auth/token (credentials: include) → { token }; send as Bearer.
//
// Only the /admin route needs any of this. Public browsing never calls it, so a
// signed-out visitor triggers no auth traffic at all.
//
// Copied from the mac-membership-verify app rather than rewritten — this is the
// shared MAC Suite client contract, and it should stay identical across apps.

export type Provider = 'google' | 'microsoft';

const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? 'https://auth.monashcoding.com';

let cachedToken: string | null = null;

/** Fetch a fresh JWT from the session (cookie). Returns null if not signed in. */
export async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/token`, { credentials: 'include' });
    if (!res.ok) {
      cachedToken = null;
      return null;
    }
    const body = (await res.json()) as { token?: string };
    cachedToken = body.token ?? null;
    return cachedToken;
  } catch {
    cachedToken = null;
    return null;
  }
}

export function getToken(): string | null {
  return cachedToken;
}

/** Return a cached token or fetch one from the session. */
export async function ensureToken(): Promise<string | null> {
  return cachedToken ?? (await fetchToken());
}

/** Best-effort decode of the JWT payload for display only (never trusted). */
export interface DisplayClaims {
  email?: string;
  name?: string;
  /** Display only — the server re-verifies roles on every admin request. */
  roles?: string[];
}

export function decodeClaims(token: string | null = cachedToken): DisplayClaims | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Start social sign-in. Redirects to the provider; returns to `returnTo`. */
export async function login(provider: Provider, returnTo: string = window.location.href): Promise<void> {
  const res = await fetch(`${AUTH_URL}/api/auth/sign-in/social`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, callbackURL: returnTo }),
  });
  const body = (await res.json()) as { url?: string };
  if (body.url) window.location.assign(body.url);
}

/** Clear the shared MAC session. */
export async function signOut(): Promise<void> {
  await fetch(`${AUTH_URL}/api/auth/sign-out`, { method: 'POST', credentials: 'include' });
  cachedToken = null;
}

/**
 * Force a fresh account choice (§5 mitigation): drop the current session, then
 * restart social sign-in so the user re-authenticates and can pick the right
 * account. Used by the "Not you? Switch account" control.
 */
export async function switchAccount(provider: Provider, returnTo: string = window.location.href): Promise<void> {
  await signOut();
  await login(provider, returnTo);
}
