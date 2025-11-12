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
