import { AccountType, OAuthProvider } from "@prisma/client";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { authCookie, createSession, hashPassword } from "@/lib/auth";
import { createUserWithProfile } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

type OAuthSlug = "google" | "apple";

type OAuthProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
};

type OAuthState = {
  provider: OAuthSlug;
  nonce: string;
  accountType: AccountType;
  mode: "login" | "register";
  returnTo: string;
};

const stateCookieName = "cuidar_oauth_state";
const stateSecret = new TextEncoder().encode(process.env.JWT_SECRET || "cuidar-link-dev-secret");
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export function normalizeOAuthProvider(provider: string): OAuthSlug | null {
  if (provider === "google" || provider === "apple") return provider;
  return null;
}

export function oauthStateCookie(value: string) {
  return {
    name: stateCookieName,
    value,
    httpOnly: true,
    path: "/",
    sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10
  };
}

export function clearOAuthStateCookie() {
  return {
    name: stateCookieName,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    secure: process.env.NODE_ENV === "production",
    maxAge: 0
  };
}

export function getOAuthStateCookieName() {
  return stateCookieName;
}

export function oauthErrorRedirect(requestUrl: string, error: string, mode: "login" | "register" = "login") {
  const url = new URL(mode === "register" ? "/register" : "/login", requestUrl);
  url.searchParams.set("authError", error);
  return url;
}

export function getOAuthRedirectUri(requestUrl: string, provider: OAuthSlug) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin;
  return `${appUrl}/api/auth/oauth/${provider}/callback`;
}

export function isProviderConfigured(provider: OAuthSlug) {
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  return Boolean(
    process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY
  );
}

export async function createOAuthState(input: OAuthState) {
  return new SignJWT(input)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(stateSecret);
}

export async function readOAuthState(token: string) {
  const verified = await jwtVerify(token, stateSecret);
  return verified.payload as OAuthState;
}

export function buildAuthorizationUrl(provider: OAuthSlug, state: string, nonce: string, redirectUri: string) {
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("prompt", "select_account");
    return url;
  }

  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", process.env.APPLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url;
}

async function createAppleClientSecret() {
  const privateKey = (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
    .setIssuer(process.env.APPLE_TEAM_ID || "")
    .setSubject(process.env.APPLE_CLIENT_ID || "")
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(key);
}

export async function exchangeOAuthCode(provider: OAuthSlug, code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: provider === "google" ? process.env.GOOGLE_CLIENT_ID || "" : process.env.APPLE_CLIENT_ID || "",
    client_secret: provider === "google" ? process.env.GOOGLE_CLIENT_SECRET || "" : await createAppleClientSecret()
  });

  const response = await fetch(
    provider === "google" ? "https://oauth2.googleapis.com/token" : "https://appleid.apple.com/auth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }
  );

  const data = (await response.json()) as { id_token?: string; error?: string; error_description?: string };

  if (!response.ok || !data.id_token) {
    throw new Error(data.error_description || data.error || "Falha ao trocar o codigo OAuth.");
  }

  return data.id_token;
}

export async function verifyOAuthIdToken(provider: OAuthSlug, idToken: string, nonce: string): Promise<OAuthProfile> {
  const verified = await jwtVerify(idToken, provider === "google" ? googleJwks : appleJwks, {
    issuer: provider === "google" ? ["https://accounts.google.com", "accounts.google.com"] : "https://appleid.apple.com",
    audience: provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.APPLE_CLIENT_ID
  });

  const payload = verified.payload;
  if (payload.nonce !== nonce) {
    throw new Error("Nonce OAuth invalido.");
  }

  return {
    provider: provider === "google" ? OAuthProvider.GOOGLE : OAuthProvider.APPLE,
    providerAccountId: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined
  };
}

export async function signInWithOAuthProfile(profile: OAuthProfile, state: OAuthState, fallbackName?: string) {
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId
      }
    },
    include: { user: true }
  });

  if (existingAccount) {
    const token = await createSession({ userId: existingAccount.user.id, role: existingAccount.user.role });
    return { token, user: existingAccount.user };
  }

  if (!profile.email) {
    throw new Error("O provedor nao retornou um e-mail.");
  }

  const linkedUser = await prisma.user.findUnique({ where: { email: profile.email } });
  const user =
    linkedUser ||
    (await createUserWithProfile({
      name: profile.name || fallbackName || profile.email.split("@")[0],
      email: profile.email,
      passwordHash: await hashPassword(crypto.randomUUID()),
      accountType: state.accountType
    }));

  await prisma.oAuthAccount.create({
    data: {
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email
    }
  });

  const token = await createSession({ userId: user.id, role: user.role });
  return { token, user };
}

export function createOAuthLoginResponse(requestUrl: string, token: string, returnTo = "/dashboard") {
  const response = Response.redirect(new URL(returnTo, requestUrl));
  response.headers.append("Set-Cookie", serializeCookie(authCookie(token)));
  response.headers.append("Set-Cookie", serializeCookie(clearOAuthStateCookie()));
  return response;
}

export function serializeCookie(cookie: ReturnType<typeof authCookie> | ReturnType<typeof clearOAuthStateCookie>) {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Path=${cookie.path}`,
    `Max-Age=${cookie.maxAge}`,
    "HttpOnly",
    `SameSite=${cookie.sameSite === "none" ? "None" : "Lax"}`
  ];

  if (cookie.secure) parts.push("Secure");
  return parts.join("; ");
}
