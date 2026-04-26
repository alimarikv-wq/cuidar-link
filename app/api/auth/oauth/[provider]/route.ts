import { AccountType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  createOAuthState,
  getOAuthRedirectUri,
  isProviderConfigured,
  normalizeOAuthProvider,
  oauthErrorRedirect,
  oauthStateCookie
} from "@/lib/oauth";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider: providerParam } = await context.params;
  const provider = normalizeOAuthProvider(providerParam);
  const mode = request.nextUrl.searchParams.get("mode") === "register" ? "register" : "login";
  const accountType =
    request.nextUrl.searchParams.get("accountType") === AccountType.PROFESSIONAL ? AccountType.PROFESSIONAL : AccountType.PATIENT;

  if (!provider) {
    return NextResponse.redirect(oauthErrorRedirect(request.url, "oauth_provider", mode));
  }

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(oauthErrorRedirect(request.url, `${provider}_config`, mode));
  }

  const nonce = crypto.randomUUID();
  const state = await createOAuthState({
    provider,
    nonce,
    accountType,
    mode,
    returnTo: "/dashboard"
  });

  const redirectUri = getOAuthRedirectUri(request.url, provider);
  const authorizationUrl = buildAuthorizationUrl(provider, state, nonce, redirectUri);
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(oauthStateCookie(state));
  return response;
}
