import type { PrescriptionInput } from '$lib/types';
import { CALCULATION_THRESHOLDS } from '$lib/config';
import { getEffectiveDaysSupply } from '$lib/utils/prescription-utils';

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
	const effectiveDaysSupply = getEffectiveDaysSupply(input);

	if (effectiveDaysSupply !== null) {
		if (typeof effectiveDaysSupply !== 'number' || isNaN(effectiveDaysSupply)) {
			errors.push('Days supply must be a valid number');
		} else if (effectiveDaysSupply < CALCULATION_THRESHOLDS.MIN_DAYS_SUPPLY) {
			errors.push(`Days supply must be at least ${CALCULATION_THRESHOLDS.MIN_DAYS_SUPPLY} day`);
		} else if (effectiveDaysSupply > CALCULATION_THRESHOLDS.MAX_DAYS_SUPPLY) {
			errors.push(`Days supply cannot exceed ${CALCULATION_THRESHOLDS.MAX_DAYS_SUPPLY} days`);
		}
	}

	// Reverse calculation validation
	if (effectiveDaysSupply === null) {
		if (!input.totalQuantity || input.totalQuantity <= 0) {
			errors.push('Either days supply or total quantity must be provided');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
