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

	// Pattern: Liquid medications - "X ml [frequency]"
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: Math.round(parseFloat(match[1])),
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: Math.round(parseFloat(match[1])),
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\s+(?:by\s+mouth\s+)?(?:three|3)\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: Math.round(parseFloat(match[1])),
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\s+(?:by\s+mouth\s+)?(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: Math.round(parseFloat(match[1])),
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: Math.round(parseFloat(match[1])),
			unitType: 'ml'
		})
	},
	// Pattern: Liquid medications - "X teaspoon(s) [frequency]" (converts to ml)
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:teaspoon|teaspoons|tsp|tsps)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: Math.round(parseFloat(match[1]) * 5), // 1 tsp = 5 ml
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:teaspoon|teaspoons|tsp|tsps)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: Math.round(parseFloat(match[1]) * 5),
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:teaspoon|teaspoons|tsp|tsps)\s+(?:by\s+mouth\s+)?(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: Math.round(parseFloat(match[1]) * 5),
			unitType: 'ml'
		})
	},
	// Pattern: Liquid medications - "X tablespoon(s) [frequency]" (converts to ml)
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:tablespoon|tablespoons|tbsp|tbsps)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: Math.round(parseFloat(match[1]) * 15), // 1 tbsp = 15 ml
			unitType: 'ml'
		})
	},
	{
		pattern:
			/(\d+(?:\.\d+)?)\s*(?:tablespoon|tablespoons|tbsp|tbsps)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: Math.round(parseFloat(match[1]) * 15),
			unitType: 'ml'
		})
	},

	// Pattern: Insulin - "X unit(s) [frequency]"
	{
		pattern:
			/(\d+)\s*(?:unit|units|u)\s+(?:subcutaneously|subq|subcut|sc|inject|injection)?\s*(?:before\s+meals?|with\s+meals?|at\s+bedtime|at\s+hs|(?:once\s+)?daily|qd)/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'unit'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:unit|units|u)\s+(?:subcutaneously|subq|subcut|sc|inject|injection)?\s*twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'unit'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:unit|units|u)\s+(?:subcutaneously|subq|subcut|sc|inject|injection)?\s*(?:three|3)\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'unit'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:unit|units|u)\s+(?:subcutaneously|subq|subcut|sc|inject|injection)?\s*(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'unit'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:unit|units|u)\s+(?:subcutaneously|subq|subcut|sc|inject|injection)?\s*before\s+each\s+meal/i,
		extractor: (match) => ({
			dosesPerDay: 3, // Typically 3 meals per day
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'unit'
		})
	},
	{
		pattern:
			/(\d+)\s*(?:unit|units|u)\s+(?:subcutaneously|subq|subcut|sc|inject|injection)?\s*at\s+bedtime|at\s+hs/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'unit'
		})
	},

	// Pattern: Inhalers - "X puff(s) [frequency]"
	{
		pattern: /(\d+)\s*(?:puff|puffs)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'puff'
		})
	},
	{
		pattern: /(\d+)\s*(?:puff|puffs)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'puff'
		})
	},
	{
		pattern: /(\d+)\s*(?:puff|puffs)\s+(?:by\s+mouth\s+)?(?:three|3)\s+times\s+daily|tid/i,
		extractor: (match) => ({
			dosesPerDay: 3,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'puff'
		})
	},
	{
		pattern: /(\d+)\s*(?:puff|puffs)\s+(?:by\s+mouth\s+)?(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'puff'
		})
	},
	{
		pattern: /(\d+)\s*(?:puff|puffs)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'puff'
		})
	},
	{
		pattern: /(\d+)\s*(?:puff|puffs)\s+(?:as\s+needed|prn|as\s+directed)/i,
		extractor: (match) => ({
			dosesPerDay: 1, // Conservative estimate for PRN
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'puff'
		})
	},
	// Pattern: Inhalers - "X actuation(s) [frequency]"
	{
		pattern: /(\d+)\s*(?:actuation|actuations)\s+(?:by\s+mouth\s+)?(?:once\s+)?daily|qd/i,
		extractor: (match) => ({
			dosesPerDay: 1,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'actuation'
		})
	},
	{
		pattern: /(\d+)\s*(?:actuation|actuations)\s+(?:by\s+mouth\s+)?twice\s+daily|bid/i,
		extractor: (match) => ({
			dosesPerDay: 2,
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'actuation'
		})
	},
	{
		pattern: /(\d+)\s*(?:actuation|actuations)\s+(?:by\s+mouth\s+)?(\d+)\s+times\s+daily/i,
		extractor: (match) => ({
			dosesPerDay: parseInt(match[2], 10),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'actuation'
		})
	},
	{
		pattern: /(\d+)\s*(?:actuation|actuations)\s+every\s+(\d+)\s+hours?/i,
		extractor: (match) => ({
			dosesPerDay: calculateFrequencyFromHours(parseInt(match[2], 10)),
			unitsPerDose: parseInt(match[1], 10),
			unitType: 'actuation'
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
