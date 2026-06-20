function stripTrailingSlash(value: string): string {
	return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLocalFrontendHost(hostname: string): boolean {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

// Production backend URL (Vercel) used when NEXT_PUBLIC_API_URL is not set.
const DEFAULT_BACKEND = "https://guardscope.app";

function resolveApiBase(): string {
	const explicit = process.env.NEXT_PUBLIC_API_URL;
	if (explicit) return stripTrailingSlash(explicit);

	if (typeof window !== "undefined") {
		const { protocol, hostname } = window.location;

		// Local dev default.
		if (protocol.startsWith("http") && isLocalFrontendHost(hostname)) {
			return "http://localhost:8000";
		}

		// Production: the Vercel-hosted API, not the frontend origin.
		return DEFAULT_BACKEND;
	}

	// Build-time/SSR fallback.
	return DEFAULT_BACKEND;
}

function resolveWsBase(): string {
	const explicit = process.env.NEXT_PUBLIC_WS_URL;
	if (explicit) return stripTrailingSlash(explicit);

	if (typeof window !== "undefined") {
		const { protocol, hostname } = window.location;

		if (protocol.startsWith("http") && isLocalFrontendHost(hostname)) {
			return "ws://localhost:8000";
		}

		return "wss://guardscope.app";
	}

	return "wss://guardscope.app";
}

export const API_BASE = resolveApiBase();
export const WS_BASE = resolveWsBase();
