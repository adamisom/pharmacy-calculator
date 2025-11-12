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
		console.log('[RxNorm] Response:', JSON.stringify(data, null, 2));

		const candidate = data.approximateGroup?.candidate?.[0];
		if (!candidate?.rxcui || !candidate?.name) {
			console.log('[RxNorm] No candidate found for:', drugName);
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

export async function getNDCsForRxCUI(rxcui: string): Promise<string[]> {
	const cacheKey = `rxnorm:ndcs:${rxcui}`;
	const cached = cache.get<string[]>(cacheKey);
	if (cached) return cached;

	try {
		const url = `${API_CONFIG.RXNORM_BASE_URL}/rxcui/${rxcui}/ndcs.json`;
		const data = await fetchWithRetry<RxNormNDCResult>(url);

		const ndcs = data.ndcGroup?.ndcList?.ndc || [];
		cache.set(cacheKey, ndcs);
		return ndcs;
	} catch {
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
	// Check if input looks like an NDC (10-11 digits, possibly with dashes)
	const cleaned = input.replace(/[-\s]/g, '');
	return /^\d{10,11}$/.test(cleaned);
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
