import type { NDCPackage, NDCRecommendation } from '$lib/types';
import { CALCULATION_THRESHOLDS } from '$lib/config';
import { calculatePackagesNeeded, calculateOverfill, calculateUnderfill } from './quantity';

export function createNDCRecommendation(
	ndc: string,
	packagesNeeded: number,
	packageDetails: NDCPackage,
	totalQuantityNeeded: number
): NDCRecommendation {
	const totalUnits = packagesNeeded * packageDetails.packageSize;
	const overfill = calculateOverfill(
		totalQuantityNeeded,
		packagesNeeded,
		packageDetails.packageSize
	);

	// Log to file only (too verbose for console)
	import('$lib/utils/debug-logger')
		.then(({ logToFile }) => {
			logToFile(`[NDC-REC] Creating recommendation for ${ndc}`, {
				need: totalQuantityNeeded,
				packageSize: packageDetails.packageSize,
				packagesNeeded,
				totalUnits,
				overfill: `${overfill.toFixed(1)}%`
			});
		})
		.catch(() => {
			// Ignore if logger not available
		});

	return {
		ndc,
		packagesNeeded,
		totalUnits,
		overfill,
		packageDetails
	};
}

export function selectOptimalNDCs(
	packages: NDCPackage[],
	totalQuantityNeeded: number
): NDCRecommendation[] {
	// Filter to only active NDCs with valid package sizes
	// Exclude packages where extraction failed (packageSize === 1 is the default)
	// Also exclude unreasonably large packages (bulk/industrial, not consumer packages)
	const activePackages = packages.filter(
		(pkg) =>
			pkg.isActive &&
			pkg.packageSize > 1 &&
			pkg.packageSize <= CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE
	);

	console.log(
		`[NDC-SELECTOR] Input: ${packages.length} packages, Filtered: ${activePackages.length} valid active packages (excluded ${packages.length - activePackages.length} with packageSize <= 1, > ${CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE}, or inactive)`
	);

	if (activePackages.length === 0) {
		// If no valid active packages, check for inactive ones with valid sizes
		const inactiveValidPackages = packages.filter(
			(pkg) =>
				!pkg.isActive &&
				pkg.packageSize > 1 &&
				pkg.packageSize <= CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE
		);

		if (inactiveValidPackages.length > 0) {
			// Return inactive ones with warnings (will be handled by caller)
			return inactiveValidPackages
				.map((pkg) => {
					const packagesNeeded = calculatePackagesNeeded(totalQuantityNeeded, pkg.packageSize);
					if (packagesNeeded === 0) return null;
					const rec = createNDCRecommendation(pkg.ndc, packagesNeeded, pkg, totalQuantityNeeded);
					if (rec.totalUnits === 0) return null;
					return rec;
				})
				.filter((rec): rec is NDCRecommendation => rec !== null);
		}

		// No valid packages at all (all have packageSize === 1 or are invalid)
		// Return empty array - caller will handle "no packages found" error
		return [];
	}

	// Calculate recommendations for each active package
	const recommendations: NDCRecommendation[] = activePackages
		.map((pkg) => {
			const packagesNeeded = calculatePackagesNeeded(totalQuantityNeeded, pkg.packageSize);

			// Filter out invalid recommendations (packagesNeeded === 0 or totalUnits === 0)
			if (packagesNeeded === 0) {
				return null;
			}

			const underfill = calculateUnderfill(totalQuantityNeeded, packagesNeeded, pkg.packageSize);

			// Filter out packages with too much underfill
			if (underfill > CALCULATION_THRESHOLDS.UNDERFILL_WARNING) {
				return null;
			}

			const rec = createNDCRecommendation(pkg.ndc, packagesNeeded, pkg, totalQuantityNeeded);

			// Double-check: filter out if totalUnits is 0 (shouldn't happen, but safety check)
			if (rec.totalUnits === 0) {
				return null;
			}

			return rec;
		})
		.filter((rec): rec is NDCRecommendation => rec !== null);

	// Sort by: overfill % (ascending), then package count (ascending)
	recommendations.sort((a, b) => {
		if (a.overfill !== b.overfill) {
			return a.overfill - b.overfill;
		}
		return a.packagesNeeded - b.packagesNeeded;
	});

	// Return top 3 recommendations
	return recommendations.slice(0, 3);
}

function calculateCombinationOverfill(
	pkg1: NDCPackage,
	count1: number,
	pkg2: NDCPackage,
	count2: number,
	totalQuantityNeeded: number
): number {
	const totalUnits = count1 * pkg1.packageSize + count2 * pkg2.packageSize;
	return ((totalUnits - totalQuantityNeeded) / totalQuantityNeeded) * 100;
}

function tryPackageCombination(
	pkg1: NDCPackage,
	pkg2: NDCPackage,
	totalQuantityNeeded: number
): NDCRecommendation[] | null {
	let bestCombination: NDCRecommendation[] | null = null;
	let bestOverfill = Infinity;

	// Try different combinations of packages
	for (let count1 = 0; count1 <= Math.ceil(totalQuantityNeeded / pkg1.packageSize); count1++) {
		const remaining = totalQuantityNeeded - count1 * pkg1.packageSize;
		if (remaining <= 0) {
			// Pkg1 alone is sufficient
			// Skip if count1 is 0 (invalid recommendation)
			if (count1 > 0) {
				const rec1 = createNDCRecommendation(pkg1.ndc, count1, pkg1, totalQuantityNeeded);
				// Double-check: filter out if totalUnits is 0
				if (rec1.totalUnits > 0 && rec1.overfill < bestOverfill) {
					bestOverfill = rec1.overfill;
					bestCombination = [rec1];
				}
			}
			continue;
		}

		const count2 = calculatePackagesNeeded(remaining, pkg2.packageSize);

		// Skip combinations where either count is 0 (invalid)
		if (count1 === 0 || count2 === 0) {
			continue;
		}

		const overfill = calculateCombinationOverfill(pkg1, count1, pkg2, count2, totalQuantityNeeded);

		if (overfill < bestOverfill && overfill >= 0) {
			const rec1 = createNDCRecommendation(pkg1.ndc, count1, pkg1, totalQuantityNeeded);
			const rec2 = createNDCRecommendation(pkg2.ndc, count2, pkg2, totalQuantityNeeded);

			// Double-check: filter out if totalUnits is 0
			if (rec1.totalUnits > 0 && rec2.totalUnits > 0) {
				bestOverfill = overfill;
				bestCombination = [rec1, rec2];
			}
		}
	}

	// Final safety check: filter out any invalid recommendations (packagesNeeded === 0 or totalUnits === 0)
	if (bestCombination) {
		const validCombination = bestCombination.filter(
			(rec) => rec.packagesNeeded > 0 && rec.totalUnits > 0
		);
		return validCombination.length > 0 ? validCombination : null;
	}

	return bestCombination;
}

function findBestTwoPackCombination(
	packages: NDCPackage[],
	totalQuantityNeeded: number
): NDCRecommendation[] | null {
	let bestCombination: NDCRecommendation[] | null = null;
	let bestOverfill = Infinity;

	// Try all combinations of 2 different packages
	for (let i = 0; i < packages.length; i++) {
		for (let j = i + 1; j < packages.length; j++) {
			const combination = tryPackageCombination(packages[i], packages[j], totalQuantityNeeded);

			// Only consider true multi-pack combinations (2+ different packages)
			if (combination && combination.length >= 2) {
				const avgOverfill =
					combination.reduce((sum, rec) => sum + rec.overfill, 0) / combination.length;
				if (avgOverfill < bestOverfill) {
					bestOverfill = avgOverfill;
					bestCombination = combination;
				}
			}
		}
	}

	return bestCombination;
}

export function findMultiPackCombination(
	packages: NDCPackage[],
	totalQuantityNeeded: number
): NDCRecommendation[] | null {
	const activePackages = packages.filter(
		(pkg) =>
			pkg.isActive &&
			pkg.packageSize > 1 &&
			pkg.packageSize <= CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE
	);
	if (activePackages.length < 2) return null;

	const bestCombination = findBestTwoPackCombination(activePackages, totalQuantityNeeded);
	if (!bestCombination) return null;

	// Final safety check: filter out any invalid recommendations
	const validCombination = bestCombination.filter(
		(rec) => rec.packagesNeeded > 0 && rec.totalUnits > 0
	);
	if (validCombination.length === 0) return null;

	// Only return if better than single-pack options
	const singlePackOptions = selectOptimalNDCs(packages, totalQuantityNeeded);
	if (singlePackOptions.length > 0) {
		const bestSingleOverfill = singlePackOptions[0].overfill;
		const bestMultiOverfill =
			validCombination.reduce((sum, rec) => sum + rec.overfill, 0) / validCombination.length;
		if (bestSingleOverfill < bestMultiOverfill) {
			return null; // Single pack is better
		}
	}

	return validCombination;
}
