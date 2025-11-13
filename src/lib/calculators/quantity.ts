import type { ParsedSIG } from '$lib/types';

export function calculateTotalQuantityNeeded(parsedSIG: ParsedSIG, daysSupply: number): number {
	return parsedSIG.dosesPerDay * daysSupply * parsedSIG.unitsPerDose;
}

export function calculatePackagesNeeded(totalQuantity: number, packageSize: number): number {
	// Validate inputs - if invalid, return 0 (will be filtered out by caller)
	if (packageSize <= 0 || totalQuantity <= 0) {
		return 0;
	}
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
