import type { PrescriptionInput, CalculationResult, NDCPackage } from '$lib/types';
import { normalizeDrugInput, isNDCFormat, normalizeNDC } from '$lib/api/rxnorm';
import { getNDCsForRxCUI } from '$lib/api/rxnorm';
import {
	getMultipleNDCInfo,
	searchNDCPackagesByDrugName,
	getAllPackagesForProductNDC
} from '$lib/api/fda';
import { parseSIGWithFallback } from '$lib/parsers/sig';
import { calculateTotalQuantityNeeded } from '$lib/calculators/quantity';
import { calculateDaysSupplyFromQuantity } from '$lib/calculators/reverse';
import { selectOptimalNDCs, findMultiPackCombination } from '$lib/calculators/ndc-selector';
import { validatePrescriptionInput } from './validation';
import { CALCULATION_THRESHOLDS } from '$lib/config';
import { getDrugNotFoundError, getGenericError } from '$lib/utils/errors';
import { getEffectiveDaysSupply } from '$lib/utils/prescription-utils';
import { generateWarnings } from '$lib/utils/warnings';

export async function calculatePrescription(input: PrescriptionInput): Promise<CalculationResult> {
	// 1. Validate input
	const validation = validatePrescriptionInput(input);
	if (!validation.valid) {
		throw getGenericError('Validation failed', validation.errors.join('. '));
	}

	// 2. Normalize drug input and get package info
	let rxcui: string;
	let drugName: string;
	let packages: NDCPackage[];

	if (isNDCFormat(input.drugNameOrNDC)) {
		// Direct NDC input - skip RxNorm lookup
		// Pass original NDC string to preserve dashes for FDA API lookup
		const originalNDC = input.drugNameOrNDC.trim();
		const normalizedNDC = normalizeNDC(originalNDC);
		rxcui = 'N/A';
		drugName = `NDC: ${normalizedNDC}`;

		// Check if it's a product NDC (8-9 digits) or package NDC (10-11 digits)
		const cleaned = originalNDC.replace(/[-\s]/g, '');
		const isProductNDC = cleaned.length >= 8 && cleaned.length <= 9;

		if (isProductNDC) {
			// For product NDCs, get all packaging options
			packages = await getAllPackagesForProductNDC(originalNDC);
		} else {
			// For package NDCs, get single package info
			const packageInfo = await getMultipleNDCInfo([originalNDC]);
			packages = packageInfo;
		}

		if (packages.length === 0) {
			throw getGenericError(
				'No package information found',
				'Unable to retrieve package information for this NDC. Please verify the NDC.'
			);
		}
	} else {
		// Drug name input - use RxNorm
		const normalized = await normalizeDrugInput(input.drugNameOrNDC);
		if (!normalized) {
			console.error('[Calculation] Drug normalization failed for:', input.drugNameOrNDC);
			throw getDrugNotFoundError();
		}
		rxcui = normalized.rxcui;
		drugName = normalized.name;

		// Try RxNorm first
		const ndcs = await getNDCsForRxCUI(rxcui);

		if (ndcs.length > 0) {
			// Get package info from FDA for RxNorm NDCs
			packages = await getMultipleNDCInfo(ndcs);
		} else {
			// Fallback: if RxNorm has no NDCs, search FDA directly by drug name
			packages = await searchNDCPackagesByDrugName(drugName);
		}

		if (packages.length === 0) {
			console.error('[Calculation] No packages found for drug:', drugName, 'RxCUI:', rxcui);
			throw getGenericError(
				'No package information found',
				'Unable to retrieve package information for this medication. Please verify the drug name.'
			);
		}
	}

	// 4. Parse SIG
	const parsedSIG = parseSIGWithFallback(input.sig, input.manualDosesPerDay);

	// 5. Calculate quantity or days supply
	const effectiveDaysSupply = getEffectiveDaysSupply(input);

	let totalQuantityNeeded: number;
	let daysSupply: number;

	if (effectiveDaysSupply !== null) {
		daysSupply = effectiveDaysSupply;
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
	const warnings = generateWarnings(recommendations, packages);

	return {
		rxcui,
		drugName,
		recommendedNDCs: recommendations,
		totalQuantityNeeded,
		daysSupply,
		warnings
	};
}
