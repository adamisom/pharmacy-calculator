import { API_CONFIG } from '$lib/config';
import { cache } from './cache';
import { getDrugNotFoundError, getGenericError } from '$lib/utils/errors';
import { fetchWithRetry } from './fetch-utils';

interface RxNormApproximateTermResult {
	approximateGroup?: {
		candidate?: Array<{
			rxcui?: string;
			name?: string;
		}>;
	};
}

interface RxNormNDCResult {
	ndcGroup?: {
		ndcList?: {
			ndc?: string[];
		};
	};
}

export async function searchDrugName(
	drugName: string
): Promise<{ rxcui: string; name: string } | null> {
	const cacheKey = `rxnorm:approximateTerm:${drugName.toLowerCase().trim()}`;
	const cached = cache.get<{ rxcui: string; name: string }>(cacheKey);
	if (cached) return cached;

	try {
		const url = `${API_CONFIG.RXNORM_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`;
		console.log('[RxNorm] Searching for drug:', drugName, 'URL:', url);
		const data = await fetchWithRetry<RxNormApproximateTermResult>(url);

		// Find first candidate that has both rxcui and name
		const candidates = data.approximateGroup?.candidate || [];
		const candidate = candidates.find((c) => c.rxcui && c.name);

		// Only log full response if there's an issue (no candidates or no name found)
		if (candidates.length === 0 || !candidate?.rxcui || !candidate?.name) {
			console.log('[RxNorm] No candidate with name found for:', drugName);
			console.log('[RxNorm] Full response:', JSON.stringify(data, null, 2));
			return null;
		}

		const result = { rxcui: candidate.rxcui, name: candidate.name };
		cache.set(cacheKey, result);
		return result;
	} catch (err) {
		console.error('[RxNorm] Error searching for drug:', drugName, err);
		if (err instanceof Error && err.message.includes('timeout')) {
			throw getAPITimeoutError();
		}
		throw getDrugNotFoundError(err instanceof Error ? err : undefined);
	}
}

export async function getNDCsForRxCUI(rxcui: string, forceRefresh = false): Promise<string[]> {
	const cacheKey = `rxnorm:ndcs:${rxcui}`;
	const cached = cache.get<string[]>(cacheKey);

	// If cached and not forcing refresh, return it (even if empty - might be valid)
	if (cached && !forceRefresh) {
		console.log('[RxNorm] NDCs from cache for RxCUI:', rxcui, 'count:', cached.length);
		// If cache has 0, invalidate and retry once
		if (cached.length === 0) {
			console.log('[RxNorm] Cache has 0 NDCs, invalidating and retrying...');
			cache.delete(cacheKey);
			return getNDCsForRxCUI(rxcui, true);
		}
		return cached;
	}

	try {
		const url = `${API_CONFIG.RXNORM_BASE_URL}/rxcui/${rxcui}/ndcs.json`;
		console.log('[RxNorm] Fetching NDCs for RxCUI:', rxcui, 'URL:', url);
		const data = await fetchWithRetry<RxNormNDCResult>(url);

		const ndcs = data.ndcGroup?.ndcList?.ndc || [];
		console.log('[RxNorm] Extracted NDCs:', ndcs.length, ndcs.slice(0, 5));

		// Only log full response if no NDCs found (might indicate an issue)
		if (ndcs.length === 0) {
			console.log('[RxNorm] No NDCs found, full response:', JSON.stringify(data, null, 2));
		}

		// Only cache if we got results (don't cache empty arrays to allow retries)
		if (ndcs.length > 0) {
			cache.set(cacheKey, ndcs);
		}
		return ndcs;
	} catch (err) {
		console.error('[RxNorm] Error fetching NDCs for RxCUI:', rxcui, err);
		throw getGenericError(
			`Failed to get NDCs for RxCUI ${rxcui}`,
			'Unable to retrieve package information. Please try again.'
		);
	}
}

export function normalizeNDC(ndc: string): string {
	// Remove dashes and spaces, ensure 11 digits
	const cleaned = ndc.replace(/[-\s]/g, '');
	if (cleaned.length === 10) {
		// Pad with leading zero if 10 digits
		return '0' + cleaned;
	}
	return cleaned;
}

export function isNDCFormat(input: string): boolean {
	// Check if input looks like an NDC (8-11 digits, possibly with dashes)
	// Product NDCs are 8-9 digits, package NDCs are 10-11 digits
	const cleaned = input.replace(/[-\s]/g, '');
	return /^\d{8,11}$/.test(cleaned);
}

export async function normalizeDrugInput(
	input: string
): Promise<{ rxcui: string; name: string } | null> {
	const trimmed = input.trim();

	// If it looks like an NDC, we can't normalize via RxNorm
	// Return null and let the caller handle NDC lookup directly
	if (isNDCFormat(trimmed)) {
		return null;
	}

	return searchDrugName(trimmed);
}
