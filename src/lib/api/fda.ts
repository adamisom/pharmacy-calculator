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

export async function getNDCPackageInfo(ndc: string): Promise<NDCPackage | null> {
	const normalizedNDC = normalizeNDC(ndc);
	const cacheKey = `fda:ndc:${normalizedNDC}`;
	const cached = cache.get<NDCPackage>(cacheKey);
	if (cached) return cached;

	try {
		const apiKey = getFDAApiKey();
		const apiKeyParam = apiKey ? `&api_key=${apiKey}` : '';

		// Try both normalized format and original format (with dashes)
		const originalNDC = ndc.trim();
		const isPackageNDC = normalizedNDC.length === 11;
		const searchField = isPackageNDC ? 'package_ndc' : 'product_ndc';
		console.log('[FDA] Looking up NDC:', { original: originalNDC, normalized: normalizedNDC, isPackageNDC, searchField });
		
		// For product NDCs (8-9 digits), try original format first (FDA API prefers dashes)
		// For package NDCs (11 digits), try normalized format first
		let url: string;
		let data: FDANDCResponse;
		let result: FDANDCResponse['results'][0] | undefined;
		
		if (isPackageNDC) {
			// Try normalized format first for package NDCs
			url = `${API_CONFIG.FDA_BASE_URL}?search=${searchField}:"${normalizedNDC}"&limit=1${apiKeyParam}`;
			data = await fetchWithRetry<FDANDCResponse>(url);
			result = data.results?.[0];
			
			// If not found, try original format (with dashes) if different
			if (!result && originalNDC !== normalizedNDC) {
				url = `${API_CONFIG.FDA_BASE_URL}?search=${searchField}:"${originalNDC}"&limit=1${apiKeyParam}`;
				data = await fetchWithRetry<FDANDCResponse>(url);
				result = data.results?.[0];
			}
		} else {
			// For product NDCs, try original format first (with dashes)
			if (originalNDC !== normalizedNDC) {
				url = `${API_CONFIG.FDA_BASE_URL}?search=${searchField}:"${originalNDC}"&limit=1${apiKeyParam}`;
				console.log('[FDA] Trying original format URL:', url);
				data = await fetchWithRetry<FDANDCResponse>(url);
				result = data.results?.[0];
				console.log('[FDA] Original format result:', result ? 'found' : 'not found');
			}
			
			// If original had no dashes or didn't work, try reconstructed format with dashes
			if (!result) {
				const dashedFormat = formatNDCWithDashes(normalizedNDC);
				if (dashedFormat !== normalizedNDC && dashedFormat !== originalNDC) {
					url = `${API_CONFIG.FDA_BASE_URL}?search=${searchField}:"${dashedFormat}"&limit=1${apiKeyParam}`;
					console.log('[FDA] Trying reconstructed dashed format URL:', url);
					data = await fetchWithRetry<FDANDCResponse>(url);
					result = data.results?.[0];
					console.log('[FDA] Reconstructed dashed format result:', result ? 'found' : 'not found');
				}
			}
			
			// If not found, try normalized format as fallback (usually won't work but worth trying)
			if (!result) {
				url = `${API_CONFIG.FDA_BASE_URL}?search=${searchField}:"${normalizedNDC}"&limit=1${apiKeyParam}`;
				console.log('[FDA] Trying normalized format URL:', url);
				data = await fetchWithRetry<FDANDCResponse>(url);
				result = data.results?.[0];
				console.log('[FDA] Normalized format result:', result ? 'found' : 'not found');
			}
		}

		// If not found and we tried package_ndc, try product_ndc as fallback
		if (!result && isPackageNDC) {
			url = `${API_CONFIG.FDA_BASE_URL}?search=product_ndc:"${normalizedNDC}"&limit=1${apiKeyParam}`;
			data = await fetchWithRetry<FDANDCResponse>(url);
			result = data.results?.[0];
			
			// Also try original format for product_ndc
			if (!result && originalNDC !== normalizedNDC) {
				url = `${API_CONFIG.FDA_BASE_URL}?search=product_ndc:"${originalNDC}"&limit=1${apiKeyParam}`;
				data = await fetchWithRetry<FDANDCResponse>(url);
				result = data.results?.[0];
			}
		}

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

// Helper to convert FDA result to NDCPackage
function resultToNDCPackage(result: FDANDCResponse['results'][0], packaging?: FDANDCResponse['results'][0]['packaging'][0]): NDCPackage | null {
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
		const url = `${API_CONFIG.FDA_BASE_URL}?search=(generic_name:"${encodeURIComponent(drugName)}" OR brand_name:"${encodeURIComponent(drugName)}")&limit=100${apiKeyParam}`;
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

		console.log('[FDA] Extracted unique packages:', packages.length, packages.slice(0, 5).map(p => p.ndc));

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
		const url = `${API_CONFIG.FDA_BASE_URL}?search=(generic_name:"${encodeURIComponent(drugName)}" OR brand_name:"${encodeURIComponent(drugName)}")&limit=100${apiKeyParam}`;
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
