import type { NDCRecommendation, NDCPackage } from '$lib/types';
import { CALCULATION_THRESHOLDS } from '$lib/config';

/**
 * Generate warnings for NDC recommendations and available packages
 */
export function generateWarnings(
	recommendations: NDCRecommendation[],
	allPackages: NDCPackage[]
): string[] {
	const warnings: string[] = [];

	if (recommendations.length === 0) {
		warnings.push('No suitable packages found for this prescription.');
		return warnings;
	}

	const hasInactive = recommendations.some((rec) => !rec.packageDetails.isActive);
	if (hasInactive) {
		warnings.push('Some recommended packages are inactive and should not be used.');
	}

	recommendations.forEach((rec) => {
		if (!rec.packageDetails.isActive) {
			warnings.push(`NDC ${rec.ndc} is inactive.`);
		}
		console.log(
			`[WARNINGS] Checking NDC ${rec.ndc}: overfill=${rec.overfill.toFixed(1)}%, threshold=${CALCULATION_THRESHOLDS.OVERFILL_WARNING}%, should warn=${rec.overfill > CALCULATION_THRESHOLDS.OVERFILL_WARNING}`
		);
		if (rec.overfill > CALCULATION_THRESHOLDS.OVERFILL_WARNING) {
			warnings.push(`NDC ${rec.ndc} has ${rec.overfill.toFixed(1)}% overfill.`);
		}
	});

	// Check if all packages are inactive
	const allInactive = allPackages.every((pkg) => !pkg.isActive);
	if (allInactive && allPackages.length > 0) {
		warnings.push('All available packages for this medication are inactive.');
	}

	return warnings;
}
