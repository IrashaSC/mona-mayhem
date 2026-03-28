import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory cache: maps username -> { data, expiresAt }
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const JSON_HEADERS = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
};

/** Remove all entries from the cache whose TTL has expired. */
function pruneCache(): void {
	const now = Date.now();
	for (const [key, entry] of cache) {
		if (now >= entry.expiresAt) {
			cache.delete(key);
		}
	}
}

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	// Validate username
	if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
		return new Response(JSON.stringify({ error: 'Invalid GitHub username' }), {
			status: 400,
			headers: JSON_HEADERS,
		});
	}

	// Return cached response if still fresh
	const cached = cache.get(username);
	if (cached && Date.now() < cached.expiresAt) {
		return new Response(JSON.stringify(cached.data), {
			status: 200,
			headers: { ...JSON_HEADERS, 'X-Cache': 'HIT' },
		});
	}

	// Fetch contribution data from GitHub (server-side, bypasses browser CORS)
	let response: Response;
	try {
		response = await fetch(`https://github.com/${username}.contribs`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(10_000),
		});
	} catch (err) {
		// AbortSignal.timeout() throws a DOMException whose name is 'TimeoutError' in
		// the Web API spec; Node.js 17.3+ follows this, but older builds may use 'AbortError'.
		const isTimeout =
			err instanceof Error &&
			(err.name === 'TimeoutError' || err.name === 'AbortError');
		return new Response(
			JSON.stringify({
				error: isTimeout ? 'Request to GitHub timed out' : 'Failed to reach GitHub',
			}),
			// 504 for timeout (upstream too slow), 502 for other network failures
			{ status: isTimeout ? 504 : 502, headers: JSON_HEADERS },
		);
	}

	if (response.status === 404) {
		return new Response(JSON.stringify({ error: `GitHub user '${username}' not found` }), {
			status: 404,
			headers: JSON_HEADERS,
		});
	}

	if (!response.ok) {
		return new Response(
			JSON.stringify({ error: `GitHub returned an unexpected status: ${response.status}` }),
			{ status: 502, headers: JSON_HEADERS },
		);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		return new Response(
			JSON.stringify({ error: 'Failed to parse contribution data from GitHub' }),
			{ status: 502, headers: JSON_HEADERS },
		);
	}

	// Prune stale entries before writing to keep memory bounded
	pruneCache();
	cache.set(username, { data, expiresAt: Date.now() + CACHE_TTL_MS });

	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { ...JSON_HEADERS, 'X-Cache': 'MISS' },
	});
};
