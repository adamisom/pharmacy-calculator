/**
 * Unit conversion utilities for pharmacy calculations
 * Based on standard pharmacy conversion factors
 */

// Standard volume conversions (US pharmacy)
export const VOLUME_CONVERSIONS = {
	// Teaspoons to milliliters
	teaspoonToMl: 5,
	// Tablespoons to milliliters
	tablespoonToMl: 15,
	// Fluid ounces to milliliters (approximate)
	fluidOunceToMl: 30,
	// Cups to milliliters (8 fl oz)
	cupToMl: 240
} as const;

// Insulin concentration standards
// Most insulin is U-100 (100 units per ml), but U-200 and U-500 also exist
export const INSULIN_CONCENTRATIONS = {
	U100: 100, // 100 units per ml (most common)
	U200: 200, // 200 units per ml
	U500: 500 // 500 units per ml (rare, typically for insulin-resistant patients)
} as const;

/**
 * Convert teaspoons to milliliters
 */
export function teaspoonsToMl(teaspoons: number): number {
	return teaspoons * VOLUME_CONVERSIONS.teaspoonToMl;
}

/**
 * Convert tablespoons to milliliters
 */
export function tablespoonsToMl(tablespoons: number): number {
	return tablespoons * VOLUME_CONVERSIONS.tablespoonToMl;
}

/**
 * Convert fluid ounces to milliliters
 */
export function fluidOuncesToMl(fluidOunces: number): number {
	return fluidOunces * VOLUME_CONVERSIONS.fluidOunceToMl;
}

/**
 * Convert insulin units to milliliters based on concentration
 * @param units - Number of insulin units
 * @param concentration - Insulin concentration (default: U-100)
 * @returns Milliliters
 */
export function insulinUnitsToMl(
	units: number,
	concentration: number = INSULIN_CONCENTRATIONS.U100
): number {
	return units / concentration;
}

/**
 * Convert milliliters to insulin units based on concentration
 * @param ml - Milliliters
 * @param concentration - Insulin concentration (default: U-100)
 * @returns Insulin units
 */
export function mlToInsulinUnits(
	ml: number,
	concentration: number = INSULIN_CONCENTRATIONS.U100
): number {
	return ml * concentration;
}

/**
 * Parse volume unit from string and convert to milliliters
 * Supports: teaspoon(s), tsp, tablespoon(s), tbsp, fluid ounce(s), fl oz, cup(s)
 * @param value - Numeric value
 * @param unit - Unit string (case-insensitive)
 * @returns Milliliters
 */
export function parseVolumeToMl(value: number, unit: string): number {
	const normalized = unit.toLowerCase().trim();

	// Teaspoons
	if (normalized.match(/^(teaspoon|teaspoons|tsp|tsps)$/)) {
		return teaspoonsToMl(value);
	}

	// Tablespoons
	if (normalized.match(/^(tablespoon|tablespoons|tbsp|tbsps)$/)) {
		return tablespoonsToMl(value);
	}

	// Fluid ounces
	if (normalized.match(/^(fluid\s+ounce|fluid\s+ounces|fl\s+oz|floz)$/)) {
		return fluidOuncesToMl(value);
	}

	// Cups
	if (normalized.match(/^(cup|cups)$/)) {
		return value * VOLUME_CONVERSIONS.cupToMl;
	}

	// Already in ml or unknown - return as-is
	if (normalized.match(/^(ml|milliliter|milliliters|millilitre|millilitres)$/)) {
		return value;
	}

	// Unknown unit - return as-is (assume already in ml or let caller handle)
	return value;
}
