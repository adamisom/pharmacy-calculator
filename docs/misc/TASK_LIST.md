# NDC Calculator - Implementation Task List

This document provides a step-by-step breakdown for implementing the NDC Packaging & Quantity Calculator. Each phase includes specific files to create/modify, detailed tasks, code samples for complex parts, and manual testing steps.

---

## Phase 1: Project Setup & Core Infrastructure

### Open Questions (Resolve During Implementation)

- None for this phase

### Files to Create/Modify

- `src/lib/types.ts` - TypeScript interfaces
- `src/lib/config.ts` - API configuration and constants
- `src/lib/utils/errors.ts` - User-friendly error messages

### Tasks

#### 1.1 Create Type Definitions

**File**: `src/lib/types.ts`

```typescript
export type PackageType =
	| 'bottle'
	| 'box'
	| 'inhaler'
	| 'vial'
	| 'syringe'
	| 'tube'
	| 'pack'
	| 'carton';
export type UnitType = 'tablet' | 'capsule' | 'ml' | 'unit' | 'puff' | 'actuation';

export interface PrescriptionInput {
	drugNameOrNDC: string;
	sig: string;
	daysSupply: number | null; // null if using reverse calculation
	totalQuantity?: number; // for reverse calculation
	manualDosesPerDay?: number; // manual override for SIG parsing
}

export interface NDCPackage {
	ndc: string;
	packageSize: number;
	packageType: PackageType;
	isActive: boolean;
	manufacturer: string;
}

export interface NDCRecommendation {
	ndc: string;
	packagesNeeded: number;
	totalUnits: number;
	overfill: number; // percentage
	packageDetails: NDCPackage;
}

export interface CalculationResult {
	rxcui: string;
	drugName: string;
	recommendedNDCs: NDCRecommendation[];
	totalQuantityNeeded: number;
	daysSupply: number;
	warnings: string[];
}

export interface ParsedSIG {
	dosesPerDay: number;
	unitsPerDose: number;
	unitType: UnitType;
}
```

**Manual Testing**:

- ✅ Import types in a test file and verify TypeScript compilation
- ✅ Check that all required fields are present

#### 1.2 Create Configuration Module

**File**: `src/lib/config.ts`

```typescript
export const API_CONFIG = {
	RXNORM_BASE_URL: 'https://rxnav.nlm.nih.gov/REST',
	FDA_BASE_URL: 'https://api.fda.gov/drug/ndc.json',
	CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
	API_TIMEOUT_MS: 10000, // 10 seconds
	MAX_RETRIES: 2
} as const;

export const CALCULATION_THRESHOLDS = {
	OVERFILL_WARNING: 10, // percentage
	UNDERFILL_WARNING: 5, // percentage
	MAX_DAYS_SUPPLY: 365,
	MIN_DAYS_SUPPLY: 1
} as const;

// FDA API key is optional - only needed for higher rate limits
// For low-volume usage, you can skip this
export function getFDAApiKey(): string | undefined {
	return import.meta.env.VITE_FDA_API_KEY;
}
```

**Manual Testing**:

- ✅ Verify config values are accessible
- ✅ Test that API key getter returns undefined if not set (should still work)

#### 1.3 Create Error Utilities

**File**: `src/lib/utils/errors.ts`

```typescript
export class UserFriendlyError extends Error {
	constructor(
		message: string,
		public userMessage: string,
		public actionable?: string
	) {
		super(message);
		this.name = 'UserFriendlyError';
	}
}

export function getDrugNotFoundError(originalError?: Error): UserFriendlyError {
	return new UserFriendlyError(
		originalError?.message || 'Drug not found',
		"We couldn't find that drug. Please check the spelling or try entering the NDC directly.",
		'Try entering the NDC code instead, or check the drug name spelling.'
	);
}

export function getAPITimeoutError(): UserFriendlyError {
	return new UserFriendlyError(
		'API timeout',
		'The drug database is temporarily unavailable. Please try again in a moment.',
		'Wait a few seconds and try again.'
	);
}

export function getNoActiveNDCError(): UserFriendlyError {
	return new UserFriendlyError(
		'No active NDCs found',
		'No active packages found for this medication. The available options are inactive and should not be used.',
		'Contact the manufacturer or check for alternative medications.'
	);
}

export function getInvalidSIGError(): UserFriendlyError {
	return new UserFriendlyError(
		'SIG parsing failed',
		"We couldn't understand the prescription instructions. Please enter the number of doses per day manually.",
		'Use the "Manual Override: Doses Per Day" field below.'
	);
}

export function getGenericError(message: string, userMessage?: string): UserFriendlyError {
	return new UserFriendlyError(
		message,
		userMessage || 'Something went wrong. Please try again.',
		'If the problem persists, try refreshing the page.'
	);
}
```

**Manual Testing**:

- ✅ Call each error function and verify output is user-friendly
- ✅ Ensure no technical jargon appears in messages

---

## Phase 2: API Client Modules

### Open Questions (Resolve During Implementation)

- **Q1**: What exact response format does RxNorm `/approximateTerm` return? (Test with real API call)
- **Q2**: What exact response format does RxNorm `/rxcui/{rxcui}/ndcs` return? (Test with real API call)
- **Q3**: What exact response format does FDA NDC API return? (Test with real API call)

### Files to Create/Modify

- `src/lib/api/rxnorm.ts` - RxNorm API client
- `src/lib/api/fda.ts` - FDA NDC Directory API client
- `src/lib/api/cache.ts` - In-memory caching layer

### Tasks

#### 2.1 Create Cache Module

**File**: `src/lib/api/cache.ts`

```typescript
import { API_CONFIG } from '$lib/config';

interface CacheEntry<T> {
	data: T;
	expires: number;
}

class Cache {
	private store = new Map<string, CacheEntry<any>>();

	get<T>(key: string): T | null {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expires) {
			this.store.delete(key);
			return null;
		}

		return entry.data as T;
	}

	set<T>(key: string, data: T, ttlMs: number = API_CONFIG.CACHE_TTL_MS): void {
		this.store.set(key, {
			data,
			expires: Date.now() + ttlMs
		});
	}

	clear(): void {
		this.store.clear();
	}

	has(key: string): boolean {
		const entry = this.store.get(key);
		if (!entry) return false;
		if (Date.now() > entry.expires) {
			this.store.delete(key);
			return false;
		}
		return true;
	}
}

export const cache = new Cache();
```

**Manual Testing**:

- ✅ Set a value, retrieve it immediately (should work)
- ✅ Set a value with 1 second TTL, wait 2 seconds, retrieve (should be null)
- ✅ Test cache key collision (different APIs shouldn't conflict)

#### 2.2 Create RxNorm API Client

**File**: `src/lib/api/rxnorm.ts`

```typescript
import { API_CONFIG } from '$lib/config';
import { cache } from './cache';
import { getDrugNotFoundError, getAPITimeoutError, getGenericError } from '$lib/utils/errors';

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

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
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

async function fetchWithRetry<T>(
	url: string,
	maxRetries: number = API_CONFIG.MAX_RETRIES
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetchWithTimeout(url, API_CONFIG.API_TIMEOUT_MS);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			if (attempt < maxRetries) {
				// Wait before retry (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
			}
		}
	}

	throw lastError || new Error('Unknown error');
}

export async function searchDrugName(
	drugName: string
): Promise<{ rxcui: string; name: string } | null> {
	const cacheKey = `rxnorm:approximateTerm:${drugName.toLowerCase().trim()}`;
	const cached = cache.get<{ rxcui: string; name: string }>(cacheKey);
	if (cached) return cached;

	try {
		const url = `${API_CONFIG.RXNORM_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`;
		const data = await fetchWithRetry<RxNormApproximateTermResult>(url);

		const candidate = data.approximateGroup?.candidate?.[0];
		if (!candidate?.rxcui || !candidate?.name) {
			return null;
		}

		const result = { rxcui: candidate.rxcui, name: candidate.name };
		cache.set(cacheKey, result);
		return result;
	} catch (error) {
		if (error instanceof Error && error.message.includes('timeout')) {
			throw getAPITimeoutError();
		}
		throw getDrugNotFoundError(error instanceof Error ? error : undefined);
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
	} catch (error) {
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
```

**Manual Testing**:

- ✅ Test `searchDrugName("aspirin")` - should return RxCUI
- ✅ Test `searchDrugName("nonexistentdrugxyz123")` - should return null
- ✅ Test `getNDCsForRxCUI("valid_rxcui")` - should return NDC array
- ✅ Test cache: call same drug twice, verify second call uses cache
- ✅ Test timeout: verify timeout after 10s (mock slow network)

#### 2.3 Create FDA API Client

**File**: `src/lib/api/fda.ts`

```typescript
import { API_CONFIG, getFDAApiKey } from '$lib/config';
import { cache } from './cache';
import { normalizeNDC } from './rxnorm';
import type { NDCPackage, PackageType } from '$lib/types';
import { getAPITimeoutError, getGenericError } from '$lib/utils/errors';

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
	if (lower.includes('inhaler')) return 'inhaler';
	if (lower.includes('vial')) return 'vial';
	if (lower.includes('syringe')) return 'syringe';
	if (lower.includes('tube')) return 'tube';
	if (lower.includes('pack')) return 'pack';
	if (lower.includes('carton')) return 'carton';
	if (lower.includes('bottle')) return 'bottle';
	return 'box'; // default
}

// Check if NDC is active based on end marketing date
function isNDCActive(result: FDANDCResponse['results'][0]): boolean {
	const packaging = result.packaging?.[0];
	if (!packaging?.marketing_end_date) return true; // No end date = active

	const endDate = new Date(packaging.marketing_end_date);
	return endDate >= new Date(); // Active if end date is in future or today
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
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

async function fetchWithRetry<T>(
	url: string,
	maxRetries: number = API_CONFIG.MAX_RETRIES
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetchWithTimeout(url, API_CONFIG.API_TIMEOUT_MS);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			if (attempt < maxRetries) {
				await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
			}
		}
	}

	throw lastError || new Error('Unknown error');
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
```

**Manual Testing**:

- ✅ Test `getNDCPackageInfo("valid_11_digit_ndc")` - should return package info
- ✅ Test with invalid NDC - should return null (not throw)
- ✅ Test package size extraction from various description formats
- ✅ Test active vs inactive detection
- ✅ Test cache: same NDC twice, verify cache hit
- ✅ Test without API key (should still work)

---

## Phase 3: SIG Parser

### Open Questions (Resolve During Implementation)

- **Q4**: What percentage of real SIGs can we parse? (Test with 20+ real examples)
- **Q5**: Should we support Latin abbreviations (BID, TID, QID)? (Yes - add to patterns)

### Files to Create/Modify

- `src/lib/parsers/sig.ts` - SIG parsing logic
- `src/lib/parsers/sig-patterns.ts` - Regex patterns and frequency mappings

### Tasks

#### 3.1 Create SIG Pattern Definitions

**File**: `src/lib/parsers/sig-patterns.ts`

```typescript
import type { ParsedSIG, UnitType } from '$lib/types';

interface SIGPattern {
	pattern: RegExp;
	extractor: (match: RegExpMatchArray) => ParsedSIG | null;
}

function calculateFrequencyFromHours(hours: number): number {
	if (hours <= 0) return 1;
	return Math.round(24 / hours);
}

const SIG_PATTERNS: SIGPattern[] = [
	// Pattern: "X tablet(s) [frequency]"
	{
		pattern: /(\d+)\s*(?:tablet|tab|tabs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)\s*(?:tablet|tab|tabs)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)\s*(?:tablet|tab|tabs)\s+(?:by\s+mouth\s+)?three\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)\s*(?:tablet|tab|tabs)\s+(?:by\s+mouth\s+)?four\s+times\s+daily|qid/i,
		extractor: (match) => ({
			dosesPerDay: 4,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)\s*(?:tablet|tab|tabs)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},

	// Pattern: "X capsule(s) [frequency]" (same patterns as tablets)
	{
		pattern: /(\d+)\s*(?:capsule|caps)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	{
		pattern: /(\d+)\s*(?:capsule|caps)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	{
		pattern: /(\d+)\s*(?:capsule|caps)\s+(?:by\s+mouth\s+)?three\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	{
		pattern: /(\d+)\s*(?:capsule|caps)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},

	// Pattern: "X-Y [unit] [frequency]" (use higher value)
	{
		pattern: /(\d+)[-\s]+(\d+)\s*(?:tablet|tab|tabs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: Math.max(parseInt(match[1], 10), parseInt(match[2], 10)),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)[-\s]+(\d+)\s*(?:tablet|tab|tabs)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[3], 10)),
			unitsPerDose: Math.max(parseInt(match[1], 10), parseInt(match[2], 10)),
			unitType: 'tablet'
		})
	},

	// Pattern: "take X [unit] [frequency]"
	{
		pattern: /take\s+(\d+)\s*(?:tablet|tab|tabs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},

	// Pattern: "as needed" / "PRN" (conservative: 1 dose per day)
	{
		pattern: /(\d+)\s*(?:tablet|tab|tabs|capsule|caps)\s+(?:as\s+needed|prn|as\s+directed)/i,
		extractor: (match) => ({
			dosesPerDay: 1, // Conservative estimate
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet' // Default, could be improved
		})
	}
];

export { SIG_PATTERNS };
```

**Manual Testing**:

- ✅ Test each pattern with example SIGs
- ✅ Test edge cases: "1-2 tablets", "take 1 tablet", variations in spacing
- ✅ Verify frequency calculations are correct

#### 3.2 Create SIG Parser

**File**: `src/lib/parsers/sig.ts`

```typescript
import { SIG_PATTERNS } from './sig-patterns';
import type { ParsedSIG } from '$lib/types';
import { getInvalidSIGError } from '$lib/utils/errors';

export function parseSIG(sig: string): ParsedSIG | null {
	const normalized = sig.trim();
	if (!normalized) return null;

	for (const { pattern, extractor } of SIG_PATTERNS) {
		const match = normalized.match(pattern);
		if (match) {
			const result = extractor(match);
			if (result) return result;
		}
	}

	return null;
}

export function parseSIGWithFallback(sig: string, manualDosesPerDay?: number): ParsedSIG {
	const parsed = parseSIG(sig);

	if (parsed) return parsed;

	if (manualDosesPerDay && manualDosesPerDay > 0) {
		// Use manual override with default assumptions
		return {
			dosesPerDay: manualDosesPerDay,
			unitsPerDose: 1, // Default assumption
			unitType: 'tablet' // Default assumption
		};
	}

	throw getInvalidSIGError();
}
```

**Manual Testing**:

- ✅ Test "1 tablet twice daily" → { dosesPerDay: 2, unitsPerDose: 1, unitType: 'tablet' }
- ✅ Test "2 capsules three times daily" → { dosesPerDay: 3, unitsPerDose: 2, unitType: 'capsule' }
- ✅ Test "1-2 tablets every 6 hours" → { dosesPerDay: 4, unitsPerDose: 2, unitType: 'tablet' }
- ✅ Test invalid SIG → null
- ✅ Test with manual override → should use provided value

---

## Phase 4: Quantity Calculation Engine

### Open Questions (Resolve During Implementation)

- **Q6**: Should we always round up packages, or allow partial packages? (Assumption: Always round up)
- **Q7**: What's the maximum number of different NDCs to combine? (Assumption: 2)
- **Q8**: How to determine "common" package sizes? (Assumption: Ignore for now, focus on minimizing overfill)

### Files to Create/Modify

- `src/lib/calculators/quantity.ts` - Core quantity calculation
- `src/lib/calculators/ndc-selector.ts` - NDC selection algorithm
- `src/lib/calculators/reverse.ts` - Reverse days supply calculation

### Tasks

#### 4.1 Create Quantity Calculator

**File**: `src/lib/calculators/quantity.ts`

```typescript
import type { ParsedSIG } from '$lib/types';

export function calculateTotalQuantityNeeded(parsedSIG: ParsedSIG, daysSupply: number): number {
	return parsedSIG.dosesPerDay * daysSupply * parsedSIG.unitsPerDose;
}

export function calculatePackagesNeeded(totalQuantity: number, packageSize: number): number {
	if (packageSize <= 0) return 0;
	return Math.ceil(totalQuantity / packageSize); // Always round up
}

export function calculateOverfill(
	totalQuantity: number,
	packagesNeeded: number,
	packageSize: number
): number {
	if (totalQuantity <= 0) return 0;
	const totalUnits = packagesNeeded * packageSize;
	const overfill = totalUnits - totalQuantity;
	return (overfill / totalQuantity) * 100;
}

export function calculateUnderfill(
	totalQuantity: number,
	packagesNeeded: number,
	packageSize: number
): number {
	if (packagesNeeded === 0) return 100; // Complete underfill
	const totalUnits = packagesNeeded * packageSize;
	if (totalUnits < totalQuantity) {
		const underfill = totalQuantity - totalUnits;
		return (underfill / totalQuantity) * 100;
	}
	return 0;
}
```

**Manual Testing**:

- ✅ Test: 2 doses/day × 30 days × 1 unit = 60 units needed
- ✅ Test: 60 units needed, 30-unit package = 2 packages, 0% overfill
- ✅ Test: 60 units needed, 50-unit package = 2 packages, 66.7% overfill

#### 4.2 Create NDC Selector Algorithm

**File**: `src/lib/calculators/ndc-selector.ts`

```typescript
import type { NDCPackage, NDCRecommendation } from '$lib/types';
import { CALCULATION_THRESHOLDS } from '$lib/config';
import { calculatePackagesNeeded, calculateOverfill, calculateUnderfill } from './quantity';

export function createNDCRecommendation(
	ndc: string,
	packagesNeeded: number,
	packageDetails: NDCPackage,
	totalQuantityNeeded: number
): NDCRecommendation {
	const totalUnits = packagesNeeded * packageDetails.packageSize;
	const overfill = calculateOverfill(
		totalQuantityNeeded,
		packagesNeeded,
		packageDetails.packageSize
	);

	return {
		ndc,
		packagesNeeded,
		totalUnits,
		overfill,
		packageDetails
	};
}

export function selectOptimalNDCs(
	packages: NDCPackage[],
	totalQuantityNeeded: number
): NDCRecommendation[] {
	// Filter to only active NDCs
	const activePackages = packages.filter((pkg) => pkg.isActive);

	if (activePackages.length === 0) {
		// Return inactive ones with warnings (will be handled by caller)
		return packages.map((pkg) => {
			const packagesNeeded = calculatePackagesNeeded(totalQuantityNeeded, pkg.packageSize);
			return createNDCRecommendation(pkg.ndc, packagesNeeded, pkg, totalQuantityNeeded);
		});
	}

	// Calculate recommendations for each active package
	const recommendations: NDCRecommendation[] = activePackages
		.map((pkg) => {
			const packagesNeeded = calculatePackagesNeeded(totalQuantityNeeded, pkg.packageSize);
			const underfill = calculateUnderfill(totalQuantityNeeded, packagesNeeded, pkg.packageSize);

			// Filter out packages with too much underfill
			if (underfill > CALCULATION_THRESHOLDS.UNDERFILL_WARNING) {
				return null;
			}

			return createNDCRecommendation(pkg.ndc, packagesNeeded, pkg, totalQuantityNeeded);
		})
		.filter((rec): rec is NDCRecommendation => rec !== null);

	// Sort by: overfill % (ascending), then package count (ascending)
	recommendations.sort((a, b) => {
		if (a.overfill !== b.overfill) {
			return a.overfill - b.overfill;
		}
		return a.packagesNeeded - b.packagesNeeded;
	});

	// Return top 3 recommendations
	return recommendations.slice(0, 3);
}

export function findMultiPackCombination(
	packages: NDCPackage[],
	totalQuantityNeeded: number
): NDCRecommendation[] | null {
	const activePackages = packages.filter((pkg) => pkg.isActive);
	if (activePackages.length < 2) return null;

	let bestCombination: NDCRecommendation[] | null = null;
	let bestOverfill = Infinity;

	// Try all combinations of 2 different packages
	for (let i = 0; i < activePackages.length; i++) {
		for (let j = i + 1; j < activePackages.length; j++) {
			const pkg1 = activePackages[i];
			const pkg2 = activePackages[j];

			// Try different combinations of packages
			for (let count1 = 0; count1 <= Math.ceil(totalQuantityNeeded / pkg1.packageSize); count1++) {
				const remaining = totalQuantityNeeded - count1 * pkg1.packageSize;
				if (remaining <= 0) {
					// Pkg1 alone is sufficient
					const rec1 = createNDCRecommendation(pkg1.ndc, count1, pkg1, totalQuantityNeeded);
					if (rec1.overfill < bestOverfill) {
						bestOverfill = rec1.overfill;
						bestCombination = [rec1];
					}
					continue;
				}

				const count2 = calculatePackagesNeeded(remaining, pkg2.packageSize);
				const totalUnits = count1 * pkg1.packageSize + count2 * pkg2.packageSize;
				const overfill = ((totalUnits - totalQuantityNeeded) / totalQuantityNeeded) * 100;

				if (overfill < bestOverfill && overfill >= 0) {
					bestOverfill = overfill;
					bestCombination = [
						createNDCRecommendation(pkg1.ndc, count1, pkg1, totalQuantityNeeded),
						createNDCRecommendation(pkg2.ndc, count2, pkg2, totalQuantityNeeded)
					];
				}
			}
		}
	}

	// Only return if better than single-pack options
	const singlePackOptions = selectOptimalNDCs(packages, totalQuantityNeeded);
	if (singlePackOptions.length > 0 && singlePackOptions[0].overfill < bestOverfill) {
		return null; // Single pack is better
	}

	return bestCombination;
}
```

**Manual Testing**:

- ✅ Test with single NDC that perfectly matches → should recommend it
- ✅ Test with multiple NDCs, one has lower overfill → should recommend best one
- ✅ Test with only inactive NDCs → should return all with warnings
- ✅ Test multi-pack: 60 units needed, have 30-unit and 50-unit packages → should suggest combination

#### 4.3 Create Reverse Calculator

**File**: `src/lib/calculators/reverse.ts`

```typescript
import type { ParsedSIG } from '$lib/types';

export function calculateDaysSupplyFromQuantity(
	parsedSIG: ParsedSIG,
	totalQuantity: number
): number {
	if (parsedSIG.dosesPerDay <= 0 || parsedSIG.unitsPerDose <= 0) {
		return 0;
	}

	const dailyQuantity = parsedSIG.dosesPerDay * parsedSIG.unitsPerDose;
	const daysSupply = totalQuantity / dailyQuantity;

	// Round down (conservative approach)
	return Math.floor(daysSupply);
}
```

**Manual Testing**:

- ✅ Test: 60 units, 2 doses/day, 1 unit/dose → 30 days
- ✅ Test: 90 units, 3 doses/day, 1 unit/dose → 30 days
- ✅ Test: 100 units, 2 doses/day, 2 units/dose → 25 days

---

## Phase 5: Main Calculation Service

### Open Questions (Resolve During Implementation)

- **Q9**: Should we validate that days supply is reasonable (e.g., 1-365 days)? (Yes - add validation)
- **Q10**: How to handle when RxNorm returns NDCs but FDA has no data? (Log warning, proceed with RxNorm data only)

### Files to Create/Modify

- `src/lib/services/calculation.ts` - Main orchestration service
- `src/lib/services/validation.ts` - Input validation

### Tasks

#### 5.1 Create Input Validator

**File**: `src/lib/services/validation.ts`

```typescript
import type { PrescriptionInput } from '$lib/types';
import { CALCULATION_THRESHOLDS } from '$lib/config';

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export function validatePrescriptionInput(input: PrescriptionInput): ValidationResult {
	const errors: string[] = [];

	if (!input.drugNameOrNDC || input.drugNameOrNDC.trim() === '') {
		errors.push('Drug name or NDC is required');
	}

	if (!input.sig || input.sig.trim() === '') {
		errors.push('Prescription instructions (SIG) are required');
	}

	// Days supply validation
	if (input.daysSupply !== null) {
		if (typeof input.daysSupply !== 'number' || isNaN(input.daysSupply)) {
			errors.push('Days supply must be a valid number');
		} else if (input.daysSupply < CALCULATION_THRESHOLDS.MIN_DAYS_SUPPLY) {
			errors.push(`Days supply must be at least ${CALCULATION_THRESHOLDS.MIN_DAYS_SUPPLY} day`);
		} else if (input.daysSupply > CALCULATION_THRESHOLDS.MAX_DAYS_SUPPLY) {
			errors.push(`Days supply cannot exceed ${CALCULATION_THRESHOLDS.MAX_DAYS_SUPPLY} days`);
		}
	}

	// Reverse calculation validation
	if (input.daysSupply === null) {
		if (!input.totalQuantity || input.totalQuantity <= 0) {
			errors.push('Either days supply or total quantity must be provided');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
```

**Manual Testing**:

- ✅ Test valid input → { valid: true, errors: [] }
- ✅ Test empty drug name → { valid: false, errors: ["Drug name or NDC is required"] }
- ✅ Test days supply = 0 → { valid: false, errors: ["Days supply must be at least 1 day"] }

#### 5.2 Create Main Calculation Service

**File**: `src/lib/services/calculation.ts`

```typescript
import type { PrescriptionInput, CalculationResult, NDCPackage } from '$lib/types';
import { normalizeDrugInput, isNDCFormat, normalizeNDC } from '$lib/api/rxnorm';
import { getNDCsForRxCUI } from '$lib/api/rxnorm';
import { getNDCPackageInfo, getMultipleNDCInfo } from '$lib/api/fda';
import { parseSIGWithFallback } from '$lib/parsers/sig';
import { calculateTotalQuantityNeeded } from '$lib/calculators/quantity';
import { calculateDaysSupplyFromQuantity } from '$lib/calculators/reverse';
import { selectOptimalNDCs, findMultiPackCombination } from '$lib/calculators/ndc-selector';
import { validatePrescriptionInput } from './validation';
import { CALCULATION_THRESHOLDS } from '$lib/config';
import { getDrugNotFoundError, getNoActiveNDCError, getGenericError } from '$lib/utils/errors';

export async function calculatePrescription(input: PrescriptionInput): Promise<CalculationResult> {
	// 1. Validate input
	const validation = validatePrescriptionInput(input);
	if (!validation.valid) {
		throw getGenericError('Validation failed', validation.errors.join('. '));
	}

	// 2. Normalize drug input
	let rxcui: string;
	let drugName: string;
	let ndcs: string[];

	if (isNDCFormat(input.drugNameOrNDC)) {
		// Direct NDC input - skip RxNorm lookup
		const normalizedNDC = normalizeNDC(input.drugNameOrNDC);
		rxcui = 'N/A';
		drugName = `NDC: ${normalizedNDC}`;
		ndcs = [normalizedNDC];
	} else {
		// Drug name input - use RxNorm
		const normalized = await normalizeDrugInput(input.drugNameOrNDC);
		if (!normalized) {
			throw getDrugNotFoundError();
		}
		rxcui = normalized.rxcui;
		drugName = normalized.name;
		ndcs = await getNDCsForRxCUI(rxcui);

		if (ndcs.length === 0) {
			throw getDrugNotFoundError();
		}
	}

	// 3. Get package info from FDA
	const packages = await getMultipleNDCInfo(ndcs);
	if (packages.length === 0) {
		throw getGenericError(
			'No package information found',
			'Unable to retrieve package information for this medication. Please verify the NDC or drug name.'
		);
	}

	// 4. Parse SIG
	const parsedSIG = parseSIGWithFallback(input.sig, input.manualDosesPerDay);

	// 5. Calculate quantity or days supply
	let totalQuantityNeeded: number;
	let daysSupply: number;

	if (input.daysSupply !== null) {
		daysSupply = input.daysSupply;
		totalQuantityNeeded = calculateTotalQuantityNeeded(parsedSIG, daysSupply);
	} else if (input.totalQuantity) {
		totalQuantityNeeded = input.totalQuantity;
		daysSupply = calculateDaysSupplyFromQuantity(parsedSIG, totalQuantityNeeded);
	} else {
		throw getGenericError(
			'Missing calculation input',
			'Either days supply or total quantity must be provided.'
		);
	}

	// 6. Select optimal NDCs
	let recommendations = selectOptimalNDCs(packages, totalQuantityNeeded);

	// Try multi-pack combination if single-pack options have high overfill
	if (
		recommendations.length > 0 &&
		recommendations[0].overfill > CALCULATION_THRESHOLDS.OVERFILL_WARNING
	) {
		const multiPack = findMultiPackCombination(packages, totalQuantityNeeded);
		if (multiPack && multiPack.length > 0) {
			const multiPackOverfill =
				multiPack.reduce((sum, rec) => sum + rec.overfill, 0) / multiPack.length;
			if (multiPackOverfill < recommendations[0].overfill) {
				recommendations = multiPack;
			}
		}
	}

	// 7. Generate warnings
	const warnings: string[] = [];

	if (recommendations.length === 0) {
		warnings.push('No suitable packages found for this prescription.');
	} else {
		const hasInactive = recommendations.some((rec) => !rec.packageDetails.isActive);
		if (hasInactive) {
			warnings.push('Some recommended packages are inactive and should not be used.');
		}

		recommendations.forEach((rec) => {
			if (!rec.packageDetails.isActive) {
				warnings.push(`NDC ${rec.ndc} is inactive.`);
			}
			if (rec.overfill > CALCULATION_THRESHOLDS.OVERFILL_WARNING) {
				warnings.push(`NDC ${rec.ndc} has ${rec.overfill.toFixed(1)}% overfill.`);
			}
		});
	}

	// Check if all packages are inactive
	const allInactive = packages.every((pkg) => !pkg.isActive);
	if (allInactive && packages.length > 0) {
		warnings.push('All available packages for this medication are inactive.');
	}

	return {
		rxcui,
		drugName,
		recommendedNDCs: recommendations,
		totalQuantityNeeded,
		daysSupply,
		warnings
	};
}
```

**Manual Testing**:

- ✅ Test full flow with valid prescription → should return complete result
- ✅ Test with drug that has no NDCs → should return appropriate error
- ✅ Test with inactive NDCs only → should flag warnings
- ✅ Test reverse calculation → should calculate days supply
- ✅ Test API failure → should return user-friendly error

---

## Phase 6: SvelteKit API Route

### Open Questions (Resolve During Implementation)

- None for this phase

### Files to Create/Modify

- `src/routes/api/calculate/+server.ts` - API endpoint

### Tasks

#### 6.1 Create API Endpoint

**File**: `src/routes/api/calculate/+server.ts`

```typescript
import { json, type RequestHandler } from '@sveltejs/kit';
import { calculatePrescription } from '$lib/services/calculation';
import type { PrescriptionInput } from '$lib/types';
import { getGenericError } from '$lib/utils/errors';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input: PrescriptionInput = await request.json();

		const result = await calculatePrescription(input);

		return json(result, { status: 200 });
	} catch (error) {
		// Handle user-friendly errors
		if (error instanceof Error && 'userMessage' in error) {
			return json(
				{ error: (error as any).userMessage, actionable: (error as any).actionable },
				{ status: 400 }
			);
		}

		// Handle unknown errors
		console.error('Calculation error:', error);
		return json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
	}
};
```

**Manual Testing**:

- ✅ Test POST with valid input → should return 200 with result
- ✅ Test POST with invalid input → should return 400 with error message
- ✅ Test with curl/Postman to verify JSON format

---

## Phase 7: Frontend UI - Input Form

### Open Questions (Resolve During Implementation)

- **Q11**: Should we show loading spinner during API calls? (Yes)

### Files to Create/Modify

- `src/routes/+page.svelte` - Main calculator page
- `src/lib/components/PrescriptionForm.svelte` - Input form component
- `src/lib/components/LoadingSpinner.svelte` - Loading indicator
- Update `src/routes/+layout.svelte` - Update page title/header

### Tasks

#### 7.1 Create Loading Spinner Component

**File**: `src/lib/components/LoadingSpinner.svelte`

```svelte
<script lang="ts">
	export let loading: boolean = false;
</script>

{#if loading}
	<div class="flex items-center justify-center p-8" role="status" aria-label="Loading">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
		<span class="sr-only">Loading...</span>
	</div>
{/if}
```

**Manual Testing**:

- ✅ Verify spinner appears/disappears based on prop
- ✅ Check accessibility (screen reader)

#### 7.2 Create Prescription Form Component

**File**: `src/lib/components/PrescriptionForm.svelte`

```svelte
<script lang="ts">
	import type { PrescriptionInput } from '$lib/types';
	import LoadingSpinner from './LoadingSpinner.svelte';

	export let onSubmit: (input: PrescriptionInput) => Promise<void>;
	export let loading: boolean = false;

	let drugNameOrNDC = '';
	let sig = '';
	let daysSupply: number | '' = '';
	let totalQuantity: number | '' = '';
	let manualDosesPerDay: number | '' = '';
	let errors: string[] = [];

	async function handleSubmit() {
		errors = [];

		// Validation
		if (!drugNameOrNDC.trim()) {
			errors.push('Drug name or NDC is required');
		}
		if (!sig.trim()) {
			errors.push('Prescription instructions are required');
		}
		if (daysSupply === '' && totalQuantity === '') {
			errors.push('Either days supply or total quantity must be provided');
		}

		if (errors.length > 0) return;

		const input: PrescriptionInput = {
			drugNameOrNDC: drugNameOrNDC.trim(),
			sig: sig.trim(),
			daysSupply: daysSupply === '' ? null : Number(daysSupply),
			totalQuantity: totalQuantity === '' ? undefined : Number(totalQuantity),
			manualDosesPerDay: manualDosesPerDay === '' ? undefined : Number(manualDosesPerDay)
		};

		await onSubmit(input);
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
	<div>
		<label for="drug" class="mb-1 block text-sm font-medium text-gray-700">
			Drug Name or NDC *
		</label>
		<input
			id="drug"
			type="text"
			bind:value={drugNameOrNDC}
			disabled={loading}
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="e.g., Aspirin or 12345-678-90"
		/>
	</div>

	<div>
		<label for="sig" class="mb-1 block text-sm font-medium text-gray-700">
			Prescription Instructions (SIG) *
		</label>
		<textarea
			id="sig"
			bind:value={sig}
			disabled={loading}
			rows="3"
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="e.g., 1 tablet twice daily"
		></textarea>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<label for="daysSupply" class="mb-1 block text-sm font-medium text-gray-700">
				Days Supply
			</label>
			<input
				id="daysSupply"
				type="number"
				bind:value={daysSupply}
				disabled={loading}
				min="1"
				max="365"
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="e.g., 30"
			/>
		</div>

		<div>
			<label for="totalQuantity" class="mb-1 block text-sm font-medium text-gray-700">
				Total Quantity (for reverse calculation)
			</label>
			<input
				id="totalQuantity"
				type="number"
				bind:value={totalQuantity}
				disabled={loading}
				min="1"
				class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="e.g., 60"
			/>
		</div>
	</div>

	<div>
		<label for="manualDoses" class="mb-1 block text-sm font-medium text-gray-700">
			Manual Override: Doses Per Day (optional)
		</label>
		<input
			id="manualDoses"
			type="number"
			bind:value={manualDosesPerDay}
			disabled={loading}
			min="1"
			class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Use if SIG parsing fails"
		/>
		<p class="mt-1 text-sm text-gray-500">
			Use this if the system cannot parse your prescription instructions
		</p>
	</div>

	{#if errors.length > 0}
		<div class="rounded-md border border-red-200 bg-red-50 p-3">
			<ul class="list-inside list-disc text-sm text-red-800">
				{#each errors as error}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		type="submit"
		disabled={loading}
		class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
	>
		{#if loading}
			<LoadingSpinner loading={true} />
		{:else}
			Calculate
		{/if}
	</button>
</form>
```

**Manual Testing**:

- ✅ Test form submission with all fields → should call API
- ✅ Test validation: empty required fields → show errors
- ✅ Test reverse calc: leave days supply empty, fill quantity → should work
- ✅ Test loading state: disable form during API call

#### 7.3 Create Main Calculator Page

**File**: `src/routes/+page.svelte`

```svelte
<script lang="ts">
	import PrescriptionForm from '$lib/components/PrescriptionForm.svelte';
	import type { PrescriptionInput, CalculationResult } from '$lib/types';

	let result: CalculationResult | null = null;
	let error: string | null = null;
	let loading = false;

	async function handleSubmit(input: PrescriptionInput) {
		loading = true;
		error = null;
		result = null;

		try {
			const response = await fetch('/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'An error occurred';
				return;
			}

			result = data;
		} catch (err) {
			error = 'Unable to connect to the server. Please try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>NDC Calculator</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<h1 class="mb-6 text-3xl font-bold">NDC Packaging & Quantity Calculator</h1>

	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<PrescriptionForm {onSubmit} {loading} />
	</div>

	{#if error}
		<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
			<p class="text-red-800">{error}</p>
		</div>
	{/if}

	{#if result}
		<!-- Results will go here (Phase 8) -->
		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-2xl font-bold">Results</h2>
			<pre class="overflow-auto rounded bg-gray-100 p-4">{JSON.stringify(result, null, 2)}</pre>
		</div>
	{/if}
</div>
```

**Manual Testing**:

- ✅ Test complete workflow: input → submit → see results
- ✅ Test error display: invalid input → see friendly error
- ✅ Test loading: submit → see spinner → see results

---

## Phase 8: Frontend UI - Results Display

### Open Questions (Resolve During Implementation)

- **Q12**: How many NDC recommendations should we show? (Assumption: Top 3)
- **Q13**: Should we show JSON output for power users? (Yes - collapsible section)

### Files to Create/Modify

- `src/lib/components/ResultsDisplay.svelte` - Main results component
- `src/lib/components/NDCRecommendation.svelte` - Individual NDC card
- `src/lib/components/WarningBadge.svelte` - Warning indicators
- `src/lib/components/JSONOutput.svelte` - JSON viewer

### Tasks

#### 8.1 Create Warning Badge Component

**File**: `src/lib/components/WarningBadge.svelte`

```svelte
<script lang="ts">
	export let type: 'inactive' | 'overfill' | 'underfill';
	export let message: string = '';
</script>

{#if type === 'inactive'}
	<span
		class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
		title={message}
	>
		Inactive
	</span>
{:else if type === 'overfill'}
	<span
		class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
		title={message}
	>
		Overfill: {message}
	</span>
{:else if type === 'underfill'}
	<span
		class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
		title={message}
	>
		Underfill: {message}
	</span>
{/if}
```

#### 8.2 Create NDC Recommendation Component

**File**: `src/lib/components/NDCRecommendation.svelte`

```svelte
<script lang="ts">
	import type { NDCRecommendation } from '$lib/types';
	import WarningBadge from './WarningBadge.svelte';

	export let recommendation: NDCRecommendation;
	export let isBest: boolean = false;
</script>

<div class="rounded-lg border p-4 {isBest ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
	<div class="mb-2 flex items-start justify-between">
		<div>
			<h3 class="text-lg font-semibold">NDC: {recommendation.ndc}</h3>
			{#if isBest}
				<span class="text-xs font-medium text-blue-600">Recommended</span>
			{/if}
		</div>
		<div class="flex gap-2">
			{#if !recommendation.packageDetails.isActive}
				<WarningBadge type="inactive" message="This NDC is inactive" />
			{/if}
			{#if recommendation.overfill > 10}
				<WarningBadge type="overfill" message={`${recommendation.overfill.toFixed(1)}%`} />
			{/if}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-4 text-sm">
		<div>
			<span class="text-gray-600">Packages Needed:</span>
			<span class="ml-2 font-medium">{recommendation.packagesNeeded}</span>
		</div>
		<div>
			<span class="text-gray-600">Total Units:</span>
			<span class="ml-2 font-medium">{recommendation.totalUnits}</span>
		</div>
		<div>
			<span class="text-gray-600">Package Size:</span>
			<span class="ml-2 font-medium"
				>{recommendation.packageDetails.packageSize}
				{recommendation.packageDetails.packageType}</span
			>
		</div>
		<div>
			<span class="text-gray-600">Manufacturer:</span>
			<span class="ml-2 font-medium">{recommendation.packageDetails.manufacturer}</span>
		</div>
	</div>
</div>
```

#### 8.3 Create JSON Output Component

**File**: `src/lib/components/JSONOutput.svelte`

```svelte
<script lang="ts">
	import type { CalculationResult } from '$lib/types';

	export let result: CalculationResult;
	let expanded = false;
</script>

<div class="mt-4">
	<button
		on:click={() => (expanded = !expanded)}
		class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
	>
		<span>{expanded ? '▼' : '▶'}</span>
		<span>JSON Output</span>
	</button>

	{#if expanded}
		<pre class="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">{JSON.stringify(
				result,
				null,
				2
			)}</pre>
	{/if}
</div>
```

#### 8.4 Create Results Display Component

**File**: `src/lib/components/ResultsDisplay.svelte`

```svelte
<script lang="ts">
	import type { CalculationResult } from '$lib/types';
	import NDCRecommendation from './NDCRecommendation.svelte';
	import JSONOutput from './JSONOutput.svelte';

	export let result: CalculationResult;
</script>

<div class="space-y-4">
	<div>
		<h2 class="mb-2 text-2xl font-bold">{result.drugName}</h2>
		<p class="text-sm text-gray-600">RxCUI: {result.rxcui}</p>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div>
			<span class="text-gray-600">Total Quantity Needed:</span>
			<span class="ml-2 font-medium">{result.totalQuantityNeeded} units</span>
		</div>
		<div>
			<span class="text-gray-600">Days Supply:</span>
			<span class="ml-2 font-medium">{result.daysSupply} days</span>
		</div>
	</div>

	{#if result.warnings.length > 0}
		<div class="rounded-md border border-yellow-200 bg-yellow-50 p-4">
			<h3 class="mb-2 font-semibold text-yellow-800">Warnings</h3>
			<ul class="list-inside list-disc text-sm text-yellow-700">
				{#each result.warnings as warning}
					<li>{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if result.recommendedNDCs.length > 0}
		<div>
			<h3 class="mb-4 text-xl font-semibold">Recommended NDCs</h3>
			<div class="space-y-4">
				{#each result.recommendedNDCs as rec, index}
					<NDCRecommendation recommendation={rec} isBest={index === 0} />
				{/each}
			</div>
		</div>
	{:else}
		<div class="rounded-md border border-gray-200 bg-gray-50 p-4">
			<p class="text-gray-700">No suitable NDC recommendations found.</p>
		</div>
	{/if}

	<JSONOutput {result} />
</div>
```

#### 8.5 Integrate Results into Main Page

**File**: `src/routes/+page.svelte` (update)

Replace the results section with:

```svelte
{#if result}
	<div class="rounded-lg bg-white p-6 shadow-md">
		<ResultsDisplay {result} />
	</div>
{/if}
```

And add import:

```svelte
import ResultsDisplay from '$lib/components/ResultsDisplay.svelte';
```

**Manual Testing**:

- ✅ Test with multiple recommendations → should show top 3
- ✅ Test with warnings → should display prominently
- ✅ Test with no recommendations → should show helpful message
- ✅ Test JSON toggle → should expand/collapse

---

## Phase 9: Error Handling & Edge Cases

### Open Questions (Resolve During Implementation)

- **Q14**: Should we log errors to a service, or just console? (Assumption: Console for now)

### Files to Create/Modify

- `src/lib/components/ErrorMessage.svelte` - Error display component
- Update `src/routes/+page.svelte` - Use ErrorMessage component

### Tasks

#### 9.1 Create Error Message Component

**File**: `src/lib/components/ErrorMessage.svelte`

```svelte
<script lang="ts">
	export let error: string;
	export let actionable: string | undefined = undefined;
	export let onRetry: (() => void) | undefined = undefined;
</script>

<div class="rounded-md border border-red-200 bg-red-50 p-4">
	<div class="flex">
		<div class="flex-shrink-0">
			<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clip-rule="evenodd"
				/>
			</svg>
		</div>
		<div class="ml-3 flex-1">
			<h3 class="text-sm font-medium text-red-800">{error}</h3>
			{#if actionable}
				<p class="mt-2 text-sm text-red-700">{actionable}</p>
			{/if}
			{#if onRetry}
				<button
					on:click={onRetry}
					class="mt-3 text-sm font-medium text-red-800 underline hover:text-red-900"
				>
					Try Again
				</button>
			{/if}
		</div>
	</div>
</div>
```

#### 9.2 Update Main Page to Use ErrorMessage

**File**: `src/routes/+page.svelte` (update error handling)

Update the error display section:

```svelte
import ErrorMessage from '$lib/components/ErrorMessage.svelte'; // In the template:
{#if error}
	<ErrorMessage
		{error}
		onRetry={() => {
			error = null;
			result = null;
		}}
	/>
{/if}
```

**Manual Testing**:

- ✅ Test error display → should be clear and actionable
- ✅ Test retry functionality → should clear error and allow retry

---

## Phase 10: Testing & Refinement

### Files to Create/Modify

- `docs/test-cases.md` - Test scenarios document

### Tasks

#### 10.1 Manual Testing Checklist

Test all user flows:

- ✅ Happy path: Valid prescription → correct results
- ✅ Invalid drug name → friendly error
- ✅ Invalid SIG → suggestion for manual input
- ✅ Inactive NDCs → warnings displayed
- ✅ Overfill scenarios → warnings displayed
- ✅ Reverse calculation → days supply calculated
- ✅ API failures → friendly errors
- ✅ Loading states → UI feedback
- ✅ Responsive design → works on tablet/desktop
- ✅ Accessibility → keyboard navigation, screen readers

---

## Phase 11: Polish & Documentation

### Files to Create/Modify

- `README.md` - Update with usage instructions
- `docs/USER_GUIDE.md` - User guide for pharmacists

### Tasks

#### 11.1 Update README

**File**: `README.md`

Include:

- Project description
- Setup instructions
- Environment variables (optional FDA API key)
- How to run locally
- How to deploy

#### 11.2 Create User Guide

**File**: `docs/USER_GUIDE.md`

Document:

- How to use the calculator
- What each field means
- How to interpret results
- Common scenarios
- Troubleshooting

---

## Quick Reference: File Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── rxnorm.ts
│   │   ├── fda.ts
│   │   └── cache.ts
│   ├── calculators/
│   │   ├── quantity.ts
│   │   ├── ndc-selector.ts
│   │   └── reverse.ts
│   ├── components/
│   │   ├── PrescriptionForm.svelte
│   │   ├── ResultsDisplay.svelte
│   │   ├── NDCRecommendation.svelte
│   │   ├── WarningBadge.svelte
│   │   ├── LoadingSpinner.svelte
│   │   ├── ErrorMessage.svelte
│   │   └── JSONOutput.svelte
│   ├── parsers/
│   │   ├── sig.ts
│   │   └── sig-patterns.ts
│   ├── services/
│   │   ├── calculation.ts
│   │   └── validation.ts
│   ├── utils/
│   │   └── errors.ts
│   ├── config.ts
│   └── types.ts
├── routes/
│   ├── api/
│   │   └── calculate/
│   │       └── +server.ts
│   └── +page.svelte
└── ...

docs/
├── TASK_LIST.md (this file)
├── PRD.md
├── test-cases.md
└── USER_GUIDE.md
```

---

## Implementation Order Summary

1. **Phase 1**: Setup (types, config, errors) - Foundation
2. **Phase 2**: API clients (RxNorm, FDA, cache) - Data layer
3. **Phase 3**: SIG parser - Input processing
4. **Phase 4**: Calculators - Core logic
5. **Phase 5**: Main service - Orchestration
6. **Phase 6**: API route - Backend endpoint
7. **Phase 7**: Frontend form - User input
8. **Phase 8**: Results display - Output
9. **Phase 9**: Error handling - Resilience
10. **Phase 10**: Testing - Quality
11. **Phase 11**: Documentation - Polish

---

## Notes

- Each phase builds on previous phases
- Manual testing should be done after each phase
- Open questions should be resolved as you encounter them
- Don't move to next phase until current phase is tested
- Keep error messages user-friendly throughout
- Cache aggressively to reduce API calls
- Log technical details for debugging, but show friendly messages to users
- **FDA API key is optional** - app works without it for low-volume usage
