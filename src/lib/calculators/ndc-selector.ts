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
	// Filter to only active NDCs
	const activePackages = packages.filter((pkg) => pkg.isActive);

	if (activePackages.length === 0) {
		// Return inactive ones with warnings (will be handled by caller)
		return packages.map((pkg) => {
			const packagesNeeded = calculatePackagesNeeded(totalQuantityNeeded, pkg.packageSize);
			return createNDCRecommendation(pkg.ndc, packagesNeeded, pkg, totalQuantityNeeded);
		});
	}

	// Calculate recommendations for each active package
	const recommendations: NDCRecommendation[] = activePackages
		.map((pkg) => {
			const packagesNeeded = calculatePackagesNeeded(totalQuantityNeeded, pkg.packageSize);
			const underfill = calculateUnderfill(totalQuantityNeeded, packagesNeeded, pkg.packageSize);

			// Filter out packages with too much underfill
			if (underfill > CALCULATION_THRESHOLDS.UNDERFILL_WARNING) {
				return null;
			}

			return createNDCRecommendation(pkg.ndc, packagesNeeded, pkg, totalQuantityNeeded);
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
			const rec1 = createNDCRecommendation(pkg1.ndc, count1, pkg1, totalQuantityNeeded);
			if (rec1.overfill < bestOverfill) {
				bestOverfill = rec1.overfill;
				bestCombination = [rec1];
			}
			continue;
		}

		const count2 = calculatePackagesNeeded(remaining, pkg2.packageSize);
		const overfill = calculateCombinationOverfill(pkg1, count1, pkg2, count2, totalQuantityNeeded);

		if (overfill < bestOverfill && overfill >= 0) {
			bestOverfill = overfill;
			bestCombination = [
				createNDCRecommendation(pkg1.ndc, count1, pkg1, totalQuantityNeeded),
				createNDCRecommendation(pkg2.ndc, count2, pkg2, totalQuantityNeeded)
			];
		}
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
	const activePackages = packages.filter((pkg) => pkg.isActive);
	if (activePackages.length < 2) return null;

	const bestCombination = findBestTwoPackCombination(activePackages, totalQuantityNeeded);
	if (!bestCombination) return null;

	// Only return if better than single-pack options
	const singlePackOptions = selectOptimalNDCs(packages, totalQuantityNeeded);
	if (singlePackOptions.length > 0) {
		const bestSingleOverfill = singlePackOptions[0].overfill;
		const bestMultiOverfill =
			bestCombination.reduce((sum, rec) => sum + rec.overfill, 0) / bestCombination.length;
		if (bestSingleOverfill < bestMultiOverfill) {
			return null; // Single pack is better
		}
	}

	return bestCombination;
}
