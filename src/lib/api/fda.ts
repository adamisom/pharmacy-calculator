import { API_CONFIG, getFDAApiKey } from '$lib/config';
import { cache } from './cache';
import { normalizeNDC } from './rxnorm';
import type { NDCPackage, PackageType } from '$lib/types';
import { getAPITimeoutError } from '$lib/utils/errors';
import { fetchWithRetry } from './fetch-utils';

interface FDANDCResponse {
	results?: Array<{
		product_ndc?: string;
		package_ndc?: string;
		package_description?: string;
		packaging?: Array<{
			package_ndc?: string;
			description?: string;
			marketing_start_date?: string;
			marketing_end_date?: string;
		}>;
		labeler_name?: string;
		proprietary_name?: string;
		non_proprietary_name?: string;
	}>;
}

// Helper to extract package size from description
function extractPackageSize(description: string): number {
	// Common patterns: "30 TABLET", "100 CAPSULE", "5 ML", "1 BOTTLE, PLASTIC"
	const patterns = [
		/(\d+)\s*(?:TABLET|CAPSULE|ML|UNIT|PUFF|ACTUATION)/i,
		/(\d+)\s*(?:COUNT|CT|EA)/i
	];

	for (const pattern of patterns) {
		const match = description.match(pattern);
		if (match) {
			return parseInt(match[1], 10);
		}
	}

	// Default: try to find any number
	const numberMatch = description.match(/(\d+)/);
	return numberMatch ? parseInt(numberMatch[1], 10) : 1;
}

// Helper to infer package type from description
function inferPackageType(description: string): PackageType {
	const lower = description.toLowerCase();
	const typeMap: Record<string, PackageType> = {
		inhaler: 'inhaler',
		vial: 'vial',
		syringe: 'syringe',
		tube: 'tube',
		pack: 'pack',
		carton: 'carton',
		bottle: 'bottle'
	};

	for (const [key, type] of Object.entries(typeMap)) {
		if (lower.includes(key)) return type;
	}

	return 'box'; // default
}

// Check if NDC is active based on end marketing date
function isNDCActive(result: FDANDCResponse['results'][0]): boolean {
	const packaging = result.packaging?.[0];
	if (!packaging?.marketing_end_date) return true; // No end date = active

	const endDate = new Date(packaging.marketing_end_date);
	return endDate >= new Date(); // Active if end date is in future or today
}

export async function getNDCPackageInfo(ndc: string): Promise<NDCPackage | null> {
	const normalizedNDC = normalizeNDC(ndc);
	const cacheKey = `fda:ndc:${normalizedNDC}`;
	const cached = cache.get<NDCPackage>(cacheKey);
	if (cached) return cached;

	try {
		const apiKey = getFDAApiKey();
		const apiKeyParam = apiKey ? `&api_key=${apiKey}` : '';
		const url = `${API_CONFIG.FDA_BASE_URL}?search=product_ndc:"${normalizedNDC}"&limit=1${apiKeyParam}`;

		const data = await fetchWithRetry<FDANDCResponse>(url);
		const result = data.results?.[0];

		if (!result) return null;

		const packageNDC = result.package_ndc || result.product_ndc || normalizedNDC;
		const description = result.package_description || result.packaging?.[0]?.description || '';
		const packageSize = extractPackageSize(description);
		const packageType = inferPackageType(description);
		const isActive = isNDCActive(result);
		const manufacturer = result.labeler_name || result.proprietary_name || 'Unknown';

		const packageInfo: NDCPackage = {
			ndc: normalizeNDC(packageNDC),
			packageSize,
			packageType,
			isActive,
			manufacturer
		};

		cache.set(cacheKey, packageInfo);
		return packageInfo;
	} catch (error) {
		if (error instanceof Error && error.message.includes('timeout')) {
			throw getAPITimeoutError();
		}
		// Don't throw for missing NDC - just return null
		return null;
	}
}

export async function searchNDCsByDrugName(drugName: string): Promise<string[]> {
	const cacheKey = `fda:search:${drugName.toLowerCase().trim()}`;
	const cached = cache.get<string[]>(cacheKey);
	if (cached) {
		console.log('[FDA] NDCs from cache for drug:', drugName, 'count:', cached.length);
		return cached;
	}

	try {
		const apiKey = getFDAApiKey();
		const apiKeyParam = apiKey ? `&api_key=${apiKey}` : '';
		// Search by non-proprietary name (generic name) or proprietary name (brand name)
		const url = `${API_CONFIG.FDA_BASE_URL}?search=(non_proprietary_name:"${encodeURIComponent(drugName)}" OR proprietary_name:"${encodeURIComponent(drugName)}")&limit=100${apiKeyParam}`;
		console.log('[FDA] Searching for drug:', drugName, 'URL:', url);

		const data = await fetchWithRetry<FDANDCResponse>(url);
		console.log('[FDA] Search response count:', data.results?.length || 0);

		const ndcs: string[] = [];
		if (data.results) {
			for (const result of data.results) {
				// Extract NDCs from product_ndc or package_ndc
				if (result.product_ndc) {
					ndcs.push(normalizeNDC(result.product_ndc));
				}
				if (result.packaging) {
					for (const pkg of result.packaging) {
						if (pkg.package_ndc) {
							ndcs.push(normalizeNDC(pkg.package_ndc));
						}
					}
				}
			}
		}

		// Remove duplicates
		const uniqueNDCs = [...new Set(ndcs)];
		console.log('[FDA] Extracted unique NDCs:', uniqueNDCs.length, uniqueNDCs.slice(0, 10));

		if (uniqueNDCs.length > 0) {
			cache.set(cacheKey, uniqueNDCs);
		}
		return uniqueNDCs;
	} catch (err) {
		console.error('[FDA] Error searching for drug:', drugName, err);
		return [];
	}
}

export async function getMultipleNDCInfo(ndcs: string[]): Promise<NDCPackage[]> {
	// Fetch in parallel with limited concurrency to avoid overwhelming API
	const results = await Promise.allSettled(ndcs.map((ndc) => getNDCPackageInfo(ndc)));

	return results
		.filter(
			(result): result is PromiseFulfilledResult<NDCPackage> =>
				result.status === 'fulfilled' && result.value !== null
		)
		.map((result) => result.value);
}
