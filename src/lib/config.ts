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
