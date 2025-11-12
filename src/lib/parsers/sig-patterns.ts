import type { ParsedSIG } from '$lib/types';

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
		pattern: /(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?(?:three|3)\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?(?:four|4)\s+times\s+daily|qid/i,
		extractor: (match) => ({
			dosesPerDay: 4,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	// Pattern: "X tablet(s) N times daily" (numeric frequency)
	{
		pattern: /(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)\s*(?:tablet|tablets|tab|tabs)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},

	// Pattern: "X capsule(s) [frequency]" (same patterns as tablets)
	{
		pattern: /(\d+)\s*(?:capsule|capsules|caps)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	{
		pattern: /(\d+)\s*(?:capsule|capsules|caps)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:capsule|capsules|caps)\s+(?:by\s+mouth\s+)?(?:three|3)\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	// Pattern: "X capsule(s) N times daily" (numeric frequency)
	{
		pattern: /(\d+)\s*(?:capsule|capsules|caps)\s+(?:by\s+mouth\s+)?(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},
	{
		pattern: /(\d+)\s*(?:capsule|capsules|caps)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'capsule'
		})
	},

	// Pattern: "X-Y [unit] [frequency]" (use higher value)
	{
		pattern:
			/(\d+)[-\s]+(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: Math.max(parseInt(match[1], 10), parseInt(match[2], 10)),
			unitType: 'tablet'
		})
	},
	{
		pattern: /(\d+)[-\s]+(\d+)\s*(?:tablet|tablets|tab|tabs)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[3], 10)),
			unitsPerDose: Math.max(parseInt(match[1], 10), parseInt(match[2], 10)),
			unitType: 'tablet'
		})
	},

	// Pattern: "take X [unit] [frequency]"
	{
		pattern: /take\s+(\d+)\s*(?:tablet|tablets|tab|tabs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet'
		})
	},

	// Pattern: "as needed" / "PRN" (conservative: 1 dose per day)
	{
		pattern:
			/(\d+)\s*(?:tablet|tablets|tab|tabs|capsule|capsules|caps)\s+(?:as\s+needed|prn|as\s+directed)/i,
		extractor: (match) => ({
			dosesPerDay: 1, // Conservative estimate
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'tablet' // Default, could be improved
		})
	}
];

export { SIG_PATTERNS };
