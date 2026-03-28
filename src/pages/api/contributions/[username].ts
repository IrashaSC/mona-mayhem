import type { APIRoute } from 'astro';

export const prerender = false;

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;

interface CacheEntry {
	data: unknown;
	expires: number;
}

const cache = new Map<string, CacheEntry>();

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username || !USERNAME_RE.test(username)) {
		return new Response(JSON.stringify({ error: 'Invalid username' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const cached = cache.get(username);
	if (cached && cached.expires > Date.now()) {
		return new Response(JSON.stringify(cached.data), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const upstream = await fetch(`https://github.com/${username}.contribs`, {
			signal: controller.signal,
			headers: { 'User-Agent': 'mona-mayhem/1.0' },
		});

		if (upstream.status === 404) {
			return new Response(JSON.stringify({ error: 'User not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!upstream.ok) {
			return new Response(JSON.stringify({ error: 'Upstream error' }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const data: unknown = await upstream.json();
		cache.set(username, { data, expires: Date.now() + CACHE_TTL_MS });

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Failed to fetch contributions' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	} finally {
		clearTimeout(timeout);
	}
};
