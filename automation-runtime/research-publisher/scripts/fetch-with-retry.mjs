export async function fetchBytesWithRetry(url, { fetchImpl = fetch, attempts = 3, delayMs = 1000, timeoutMs = 20000 } = {}) {
	let last;
	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			const response = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return Buffer.from(await response.arrayBuffer());
		} catch (error) {
			last = error;
			if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
		}
	}
	throw last;
}
