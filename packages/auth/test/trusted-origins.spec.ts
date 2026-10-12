import { describe, expect, it } from "bun:test";
import { betterAuth } from "better-auth";
import { normalizeOrigin } from "../src/env";

describe("normalizeOrigin", () => {
	it("strips trailing slashes from full URLs", () => {
		expect(normalizeOrigin("https://crm-theta-five-93.vercel.app/")).toBe(
			"https://crm-theta-five-93.vercel.app",
		);
	});

	it("preserves origins that have no trailing slash", () => {
		expect(normalizeOrigin("https://crm-theta-five-93.vercel.app")).toBe(
			"https://crm-theta-five-93.vercel.app",
		);
	});

	it("extracts the origin from URLs containing paths", () => {
		expect(
			normalizeOrigin("https://crm-theta-five-93.vercel.app/sign-in"),
		).toBe("https://crm-theta-five-93.vercel.app");
	});

	it("normalizes localhost origins with ports", () => {
		expect(normalizeOrigin("http://localhost:3000/")).toBe(
			"http://localhost:3000",
		);
	});
});

describe("callback URL validation against trusted origins", () => {
	it("permits production callback and error destinations when APP_URL has a trailing slash", async () => {
		const rawAppUrl = "https://crm-theta-five-93.vercel.app/";
		const rawApiUrl = "https://crm-theta-five-93-api.vercel.app/";
		const trustedOrigins = [
			normalizeOrigin(rawAppUrl),
			normalizeOrigin(rawApiUrl),
		];

		const auth = await betterAuth({
			baseURL: normalizeOrigin(rawApiUrl),
			trustedOrigins,
		});

		const ctx = await auth.$context;
		expect(
			ctx.isTrustedOrigin("https://crm-theta-five-93.vercel.app/", {
				allowRelativePaths: true,
			}),
		).toBe(true);
		expect(
			ctx.isTrustedOrigin("https://crm-theta-five-93.vercel.app/sign-in", {
				allowRelativePaths: true,
			}),
		).toBe(true);
	});

	it("permits callback destinations derived from VERCEL_PROJECT_PRODUCTION_URL", async () => {
		const vercelHost = "crm-theta-five-93.vercel.app";
		const trustedOrigins = [normalizeOrigin(`https://${vercelHost}`)];

		const auth = await betterAuth({
			baseURL: "https://api.example.com",
			trustedOrigins,
		});

		const ctx = await auth.$context;
		expect(
			ctx.isTrustedOrigin("https://crm-theta-five-93.vercel.app/", {
				allowRelativePaths: true,
			}),
		).toBe(true);
	});

	it("rejects untrusted external callback destinations", async () => {
		const trustedOrigins = [
			normalizeOrigin("https://crm-theta-five-93.vercel.app/"),
		];

		const auth = await betterAuth({
			baseURL: "https://api.example.com",
			trustedOrigins,
		});

		const ctx = await auth.$context;
		expect(
			ctx.isTrustedOrigin("https://attacker.example.com/", {
				allowRelativePaths: true,
			}),
		).toBe(false);
	});

	it("permits relative callback paths", async () => {
		const auth = await betterAuth({
			baseURL: "https://api.example.com",
			trustedOrigins: ["https://crm-theta-five-93.vercel.app"],
		});

		const ctx = await auth.$context;
		expect(ctx.isTrustedOrigin("/", { allowRelativePaths: true })).toBe(true);
		expect(ctx.isTrustedOrigin("/sign-in", { allowRelativePaths: true })).toBe(
			true,
		);
	});
});
