import { API_CONFIG, getFDAApiKey, CALCULATION_THRESHOLDS, FDA_CONFIG } from '$lib/config';
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
	}>;
}

// Helper functions for package size extraction
// Exported for testing
export function findUnitMatches(description: string): number[] {
	const unitPatterns = [
		/(\d+)\s*(?:TABLET|CAPSULE|ML|UNIT|PUFF|ACTUATION)/i,
		/(\d+)\s*(?:COUNT|CT|EA)/i
	];

	const allUnitMatches: number[] = [];
	for (const pattern of unitPatterns) {
		const matches = description.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
		for (const match of matches) {
			allUnitMatches.push(parseInt(match[1], 10));
		}
	}
	return allUnitMatches;
}

export function findContainerMatches(description: string): number[] {
	const containerMatches = [...description.matchAll(/(\d+)\s*(?:BLISTER|POUCH|PACK|BOX|CARTON)/gi)];
	return containerMatches.map((m) => parseInt(m[1], 10));
}

export function calculateNestedPackageSize(
	containerCount: number,
	unitsPerContainer: number
): number | null {
	// Only use calculation if it makes sense (container count > 1 and reasonable product)
	if (
		containerCount > 1 &&
		containerCount * unitsPerContainer <= CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE
	) {
		return containerCount * unitsPerContainer;
	}
	return null;
}

// Helper to extract package size from description
// Exported for testing
export function extractPackageSize(description: string): number {
	// Priority 1: Look for unit counts (TABLET, CAPSULE, etc.) - these are the actual package sizes
	const allUnitMatches = findUnitMatches(description);

	if (allUnitMatches.length > 0) {
		// Try to calculate total for nested descriptions
		// Pattern: "X CONTAINER / Y TABLET in 1 CONTAINER" = X * Y total
		const containerCounts = findContainerMatches(description);
		const unitMatches = [...description.matchAll(/(\d+)\s*(?:TABLET|CAPSULE)/gi)];

		if (containerCounts.length > 0 && unitMatches.length > 0) {
			// Find the container count that's not "1" (skip outer packaging like "1 BOX")
			const containerCount = containerCounts.find((n) => n > 1) || containerCounts[0];

			// Use the first unit count (usually the per-container amount)
			const unitsPerContainer = parseInt(unitMatches[0][1], 10);

			// Calculate total: containers * units per container
			// Example: "6 BLISTER PACK in 1 BOX / 5 TABLET in 1 BLISTER" = 6 * 5 = 30
			// Example: "30 POUCH in 1 BOX / 1 TABLET in 1 POUCH" = 30 * 1 = 30
			const nestedSize = calculateNestedPackageSize(containerCount, unitsPerContainer);
			if (nestedSize !== null) {
				return nestedSize;
			}
		}

		// If multiple unit matches, return the largest (likely the total)
		if (allUnitMatches.length > 1) {
			return Math.max(...allUnitMatches);
		}
		// Single match - return it
		return allUnitMatches[0];
	}

	// Priority 2: If no unit count found, this is likely an invalid/malformed description
	// Don't guess - return a safe default and log a warning
	console.warn('[FDA] Could not extract package size from description:', description);
	return FDA_CONFIG.DEFAULT_PACKAGE_SIZE;
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

// Reconstruct proper NDC format with dashes for FDA API
// Product NDCs (8-9 digits): 5-3-2 or 5-4-2 format
// Package NDCs (11 digits): 5-3-3 format
function formatNDCWithDashes(ndc: string): string {
	const cleaned = ndc.replace(/[-\s]/g, '');

	if (cleaned.length === 8) {
		// Product NDC: 5-3 format (e.g., 53943-080)
		return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
	} else if (cleaned.length === 9) {
		// Product NDC: 5-4 format (e.g., 12345-6789)
		return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
	} else if (cleaned.length === 11) {
		// Package NDC: 5-3-3 format (e.g., 53943-080-01)
		return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
	}

	// Return as-is if length doesn't match expected patterns
	return ndc;
}

// Helper to try a single NDC lookup with a specific format
async function tryNDCLookup(
	ndc: string,
	searchField: 'package_ndc' | 'product_ndc',
	apiKeyParam: string
): Promise<FDANDCResponse['results'][0] | undefined> {
	const url = `${API_CONFIG.FDA_BASE_URL}?search=${searchField}:"${ndc}"&limit=1${apiKeyParam}`;
	const data = await fetchWithRetry<FDANDCResponse>(url);
	return data.results?.[0];
}

// Helper to find NDC using multiple format attempts
async function findNDCWithMultipleFormats(
	originalNDC: string,
	normalizedNDC: string,
	isPackageNDC: boolean,
	apiKeyParam: string
): Promise<FDANDCResponse['results'][0] | undefined> {
	const searchField = isPackageNDC ? 'package_ndc' : 'product_ndc';
	let result: FDANDCResponse['results'][0] | undefined;

	if (isPackageNDC) {
		// Try normalized format first for package NDCs
		result = await tryNDCLookup(normalizedNDC, searchField, apiKeyParam);

		// If not found, try original format (with dashes) if different
		if (!result && originalNDC !== normalizedNDC) {
			result = await tryNDCLookup(originalNDC, searchField, apiKeyParam);
		}
	} else {
		// For product NDCs, try original format first (FDA API prefers dashes)
		if (originalNDC !== normalizedNDC) {
			result = await tryNDCLookup(originalNDC, searchField, apiKeyParam);
		}

		// If original had no dashes or didn't work, try reconstructed format with dashes
		if (!result) {
			const dashedFormat = formatNDCWithDashes(normalizedNDC);
			if (dashedFormat !== normalizedNDC && dashedFormat !== originalNDC) {
				result = await tryNDCLookup(dashedFormat, searchField, apiKeyParam);
			}
		}

		// If not found, try normalized format as fallback
		if (!result) {
			result = await tryNDCLookup(normalizedNDC, searchField, apiKeyParam);
		}
	}

	// If not found and we tried package_ndc, try product_ndc as fallback
	if (!result && isPackageNDC) {
		result = await tryNDCLookup(normalizedNDC, 'product_ndc', apiKeyParam);

		// Also try original format for product_ndc
		if (!result && originalNDC !== normalizedNDC) {
			result = await tryNDCLookup(originalNDC, 'product_ndc', apiKeyParam);
		}
	}

	return result;
}

export async function getNDCPackageInfo(ndc: string): Promise<NDCPackage | null> {
	const normalizedNDC = normalizeNDC(ndc);
	const cacheKey = `fda:ndc:${normalizedNDC}`;
	const cached = cache.get<NDCPackage>(cacheKey);
	if (cached) return cached;

	try {
		const apiKey = getFDAApiKey();
		const apiKeyParam = apiKey ? `&api_key=${apiKey}` : '';

		const originalNDC = ndc.trim();
		const isPackageNDC = normalizedNDC.length === 11;
		console.log('[FDA] Looking up NDC:', {
			original: originalNDC,
			normalized: normalizedNDC,
			isPackageNDC
		});

		const result = await findNDCWithMultipleFormats(
			originalNDC,
			normalizedNDC,
			isPackageNDC,
			apiKeyParam
		);

		if (!result) return null;

		// Use resultToNDCPackage to avoid duplication
		const packageInfo = resultToNDCPackage(result);
		if (!packageInfo) return null;

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

// Helper to convert FDA result to NDCPackage
function resultToNDCPackage(
	result: FDANDCResponse['results'][0],
	packaging?: FDANDCResponse['results'][0]['packaging'][0]
): NDCPackage | null {
	const packageNDC = packaging?.package_ndc || result.package_ndc || result.product_ndc;
	if (!packageNDC) return null;

	const description = packaging?.description || result.package_description || '';
	const packageSize = extractPackageSize(description);
	const packageType = inferPackageType(description);

	// Check if this specific package is active
	let isActive = true;
	if (packaging?.marketing_end_date) {
		const endDate = new Date(packaging.marketing_end_date);
		isActive = endDate >= new Date();
	} else {
		// Fallback to product-level check
		isActive = isNDCActive(result);
	}

	const manufacturer = result.labeler_name || result.proprietary_name || 'Unknown';

	return {
		ndc: normalizeNDC(packageNDC),
		packageSize,
		packageType,
		isActive,
		manufacturer
	};
}

export async function searchNDCPackagesByDrugName(drugName: string): Promise<NDCPackage[]> {
	const cacheKey = `fda:packages:${drugName.toLowerCase().trim()}`;
	const cached = cache.get<NDCPackage[]>(cacheKey);
	if (cached) {
		console.log('[FDA] Packages from cache for drug:', drugName, 'count:', cached.length);
		return cached;
	}

	try {
		const apiKey = getFDAApiKey();
		const apiKeyParam = apiKey ? `&api_key=${apiKey}` : '';
		// Search by generic_name (generic name) or brand_name (brand name)
		const url = `${API_CONFIG.FDA_BASE_URL}?search=(generic_name:"${encodeURIComponent(drugName)}" OR brand_name:"${encodeURIComponent(drugName)}")&limit=${FDA_CONFIG.SEARCH_LIMIT}${apiKeyParam}`;
		console.log('[FDA] Searching for drug:', drugName, 'URL:', url);

		const data = await fetchWithRetry<FDANDCResponse>(url);
		console.log('[FDA] Search response count:', data.results?.length || 0);

		const packages: NDCPackage[] = [];
		const seenNDCs = new Set<string>();

		if (data.results) {
			for (const result of data.results) {
				// If result has packaging array, create a package for each packaging item
				if (result.packaging && result.packaging.length > 0) {
					for (const pkg of result.packaging) {
						const packageInfo = resultToNDCPackage(result, pkg);
						if (packageInfo && !seenNDCs.has(packageInfo.ndc)) {
							seenNDCs.add(packageInfo.ndc);
							packages.push(packageInfo);
						}
					}
				} else {
					// If no packaging array, use product-level data
					const packageInfo = resultToNDCPackage(result);
					if (packageInfo && !seenNDCs.has(packageInfo.ndc)) {
						seenNDCs.add(packageInfo.ndc);
						packages.push(packageInfo);
					}
				}
			}
		}

		console.log(
			'[FDA] Extracted unique packages:',
			packages.length,
			packages.slice(0, 5).map((p) => p.ndc)
		);

		if (packages.length > 0) {
			cache.set(cacheKey, packages);
		}
		return packages;
	} catch (err) {
		// Handle 400 errors gracefully (bad request, invalid search query)
		if (err instanceof Error && err.message.includes('HTTP 400')) {
			console.warn('[FDA] Bad request for drug search:', drugName, '- likely invalid search query');
			return [];
		}
		console.error('[FDA] Error searching for drug:', drugName, err);
		return [];
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
		// Search by generic_name (generic name) or brand_name (brand name)
		const url = `${API_CONFIG.FDA_BASE_URL}?search=(generic_name:"${encodeURIComponent(drugName)}" OR brand_name:"${encodeURIComponent(drugName)}")&limit=${FDA_CONFIG.SEARCH_LIMIT}${apiKeyParam}`;
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
