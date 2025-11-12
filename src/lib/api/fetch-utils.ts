import { API_CONFIG } from '$lib/config';
import { getAPITimeoutError } from '$lib/utils/errors';

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw getAPITimeoutError();
		}
		throw error;
	}
}

export async function fetchWithRetry<T>(
	url: string,
	maxRetries: number = API_CONFIG.MAX_RETRIES,
	timeoutMs: number = API_CONFIG.API_TIMEOUT_MS
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetchWithTimeout(url, timeoutMs);
			if (!response.ok) {
				// Don't retry on client errors (4xx) - these are likely bad requests
				if (response.status >= 400 && response.status < 500) {
					const errorText = await response.text().catch(() => response.statusText);
					throw new Error(`HTTP ${response.status}: ${errorText}`);
				}
				// Retry on server errors (5xx) and other errors
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			// Don't retry on client errors (4xx)
			if (error instanceof Error && error.message.includes('HTTP 4')) {
				throw lastError;
			}
			if (attempt < maxRetries) {
				// Wait before retry (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
			}
		}
	}

	throw lastError || new Error('Unknown error');
}
