import { NextRequest, NextResponse } from "next/server";
import { authCookie } from "@/lib/auth";
import {
  clearOAuthStateCookie,
  exchangeOAuthCode,
  getOAuthRedirectUri,
  getOAuthStateCookieName,
  isProviderConfigured,
  normalizeOAuthProvider,
  oauthErrorRedirect,
  readOAuthState,
  signInWithOAuthProfile,
  verifyOAuthIdToken
} from "@/lib/oauth";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

type CallbackPayload = {
  code?: string;
  state?: string;
  userName?: string;
};

async function parsePostPayload(request: NextRequest): Promise<CallbackPayload> {
  const form = await request.formData();
  const user = form.get("user");
  let userName: string | undefined;

  if (typeof user === "string") {
    try {
      const parsed = JSON.parse(user) as { name?: { firstName?: string; lastName?: string } };
      userName = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ") || undefined;
    } catch {
      userName = undefined;
    }
  }

  return {
    code: typeof form.get("code") === "string" ? String(form.get("code")) : undefined,
    state: typeof form.get("state") === "string" ? String(form.get("state")) : undefined,
    userName
  };
}

async function handleCallback(request: NextRequest, context: RouteContext, payload: CallbackPayload) {
  const { provider: providerParam } = await context.params;
  const provider = normalizeOAuthProvider(providerParam);

  if (!provider) {
    return NextResponse.redirect(oauthErrorRedirect(request.url, "oauth_provider"));
  }

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(oauthErrorRedirect(request.url, `${provider}_config`));
  }

  const cookieState = request.cookies.get(getOAuthStateCookieName())?.value;
  if (!payload.code || !payload.state || !cookieState || payload.state !== cookieState) {
    return NextResponse.redirect(oauthErrorRedirect(request.url, "oauth_state"));
  }

  try {
    const state = await readOAuthState(payload.state);
    if (state.provider !== provider) {
      return NextResponse.redirect(oauthErrorRedirect(request.url, "oauth_state", state.mode));
    }

    const redirectUri = getOAuthRedirectUri(request.url, provider);
    const idToken = await exchangeOAuthCode(provider, payload.code, redirectUri);
    const profile = await verifyOAuthIdToken(provider, idToken, state.nonce);
    const { token } = await signInWithOAuthProfile(profile, state, payload.userName);
    const response = NextResponse.redirect(new URL(state.returnTo || "/dashboard", request.url));
    response.cookies.set(authCookie(token));
    response.cookies.set(clearOAuthStateCookie());
    return response;
  } catch (error) {
    console.error(error);
    const mode = payload.state ? await readOAuthState(payload.state).then((state) => state.mode).catch(() => "login" as const) : "login";
    return NextResponse.redirect(oauthErrorRedirect(request.url, "oauth_callback", mode));
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleCallback(request, context, {
    code: request.nextUrl.searchParams.get("code") || undefined,
    state: request.nextUrl.searchParams.get("state") || undefined
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleCallback(request, context, await parsePostPayload(request));
}
