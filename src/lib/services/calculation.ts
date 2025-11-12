import type { PrescriptionInput, CalculationResult } from '$lib/types';
import { normalizeDrugInput, isNDCFormat, normalizeNDC } from '$lib/api/rxnorm';
import { getNDCsForRxCUI } from '$lib/api/rxnorm';
import { getMultipleNDCInfo, searchNDCsByDrugName } from '$lib/api/fda';
import { parseSIGWithFallback } from '$lib/parsers/sig';
import { calculateTotalQuantityNeeded } from '$lib/calculators/quantity';
import { calculateDaysSupplyFromQuantity } from '$lib/calculators/reverse';
import { selectOptimalNDCs, findMultiPackCombination } from '$lib/calculators/ndc-selector';
import { validatePrescriptionInput } from './validation';
import { CALCULATION_THRESHOLDS } from '$lib/config';
import { getDrugNotFoundError, getGenericError } from '$lib/utils/errors';

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
		console.log('[Calculation] Normalizing drug input:', input.drugNameOrNDC);
		const normalized = await normalizeDrugInput(input.drugNameOrNDC);
		if (!normalized) {
			console.error('[Calculation] Drug normalization failed for:', input.drugNameOrNDC);
			throw getDrugNotFoundError();
		}
		console.log('[Calculation] Normalized to:', normalized);
		rxcui = normalized.rxcui;
		drugName = normalized.name;
		ndcs = await getNDCsForRxCUI(rxcui);
		console.log('[Calculation] Found NDCs from RxNorm:', ndcs.length);

		// Fallback: if RxNorm has no NDCs, search FDA directly by drug name
		if (ndcs.length === 0) {
			console.log('[Calculation] RxNorm has no NDCs, trying FDA search by drug name...');
			ndcs = await searchNDCsByDrugName(drugName);
			console.log('[Calculation] Found NDCs from FDA search:', ndcs.length);
		}

		if (ndcs.length === 0) {
			console.error('[Calculation] No NDCs found for drug:', drugName, 'RxCUI:', rxcui);
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
