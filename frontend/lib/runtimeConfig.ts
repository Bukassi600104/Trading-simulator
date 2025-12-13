function stripTrailingSlash(value: string): string {
	return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLocalFrontendHost(hostname: string): boolean {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveApiBase(): string {
	const explicit = process.env.NEXT_PUBLIC_API_URL;
	if (explicit) return stripTrailingSlash(explicit);

	// If we're in the browser, infer a safe default.
	if (typeof window !== "undefined") {
		const { protocol, hostname, origin } = window.location;

		// Local dev default.
		if (protocol.startsWith("http") && isLocalFrontendHost(hostname)) {
			return "http://localhost:8000";
		}

		// Production default: same-origin. (If your API is on another domain,
		// set NEXT_PUBLIC_API_URL at build time.)
		return stripTrailingSlash(origin);
	}

	// Build-time/SSR fallback.
	return "http://localhost:8000";
}

function resolveWsBase(): string {
	const explicit = process.env.NEXT_PUBLIC_WS_URL;
	if (explicit) return stripTrailingSlash(explicit);

	if (typeof window !== "undefined") {
		const { protocol, hostname, host } = window.location;

		if (protocol.startsWith("http") && isLocalFrontendHost(hostname)) {
			return "ws://localhost:8000";
		}

		const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
		return `${wsProtocol}//${host}`;
	}

	return "ws://localhost:8000";
}

export const API_BASE = resolveApiBase();
export const WS_BASE = resolveWsBase();
