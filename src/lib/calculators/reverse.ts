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
