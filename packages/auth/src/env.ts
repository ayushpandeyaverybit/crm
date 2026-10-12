import "@crm/env/load";

const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_MICROSOFT_TENANT = "common";

const optional = (key: string): string | undefined => {
	const value = process.env[key];
	return value && value.length > 0 ? value : undefined;
};

const pair = (
	idKey: string,
	secretKey: string,
): { clientId: string; clientSecret: string } | undefined => {
	const clientId = optional(idKey);
	const clientSecret = optional(secretKey);

	if (!clientId || !clientSecret) {
		if (clientId || clientSecret) {
			throw new Error(`${idKey} and ${secretKey} must be set together.`);
		}
		return undefined;
	}

	return { clientId, clientSecret };
};

const googleCredentials = ():
	| { clientId: string; clientSecret: string }
	| undefined => pair("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");

const microsoftCredentials = ():
	| { clientId: string; clientSecret: string; tenantId: string }
	| undefined => {
	const credentials = pair("MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET");
	if (!credentials) return undefined;

	return {
		...credentials,
		tenantId: optional("MICROSOFT_TENANT_ID") ?? DEFAULT_MICROSOFT_TENANT,
	};
};

const slackCredentials = ():
	| { clientId: string; clientSecret: string }
	| undefined => pair("SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET");

export function normalizeOrigin(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	try {
		return new URL(trimmed).origin;
	} catch {
		return trimmed.replace(/\/+$/, "");
	}
}

const rawApiUrl =
	optional("API_URL") ?? optional("BETTER_AUTH_URL") ?? DEFAULT_API_URL;
const apiUrl = normalizeOrigin(rawApiUrl);

const configuredAppUrl = optional("APP_URL") ?? optional("NEXT_PUBLIC_APP_URL");
const appUrls = (configuredAppUrl ?? DEFAULT_APP_URL)
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean)
	.map(normalizeOrigin);

const appUrl = appUrls[0] ?? DEFAULT_APP_URL;

const vercelOrigins = [
	...(optional("VERCEL_PROJECT_PRODUCTION_URL")
		? [`https://${optional("VERCEL_PROJECT_PRODUCTION_URL")}`]
		: []),
	...(optional("VERCEL_URL") ? [`https://${optional("VERCEL_URL")}`] : []),
].map(normalizeOrigin);

const explicitTrustedOrigins = (optional("BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean)
	.map(normalizeOrigin);

export const env = {
	apiUrl,
	appUrl,
	google: googleCredentials(),
	microsoft: microsoftCredentials(),
	slack: slackCredentials(),
	cookieDomain: optional("AUTH_COOKIE_DOMAIN"),
	trustedOrigins: [
		...new Set([
			...appUrls,
			apiUrl,
			...vercelOrigins,
			...explicitTrustedOrigins,
		]),
	].filter(Boolean),
	isProduction: process.env.NODE_ENV === "production",
} as const;

export function isGoogleConfigured(): boolean {
	return env.google !== undefined;
}

export function isMicrosoftConfigured(): boolean {
	return env.microsoft !== undefined;
}

export function isSlackConfigured(): boolean {
	return env.slack !== undefined;
}

export { apiUrl, appUrl };
