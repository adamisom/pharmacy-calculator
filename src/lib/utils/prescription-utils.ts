import type { PrescriptionInput } from '$lib/types';

/**
 * Get effective days supply, treating 0 as null ONLY if totalQuantity is provided
 * (explicit reverse calculation). Otherwise, 0 is invalid.
 */
export function getEffectiveDaysSupply(input: PrescriptionInput): number | null {
	return input.daysSupply === 0 && input.totalQuantity ? null : input.daysSupply;
}
