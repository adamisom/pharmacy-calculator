export const TEST_DRUGS = [
	'aspirin',
	'ibuprofen',
	'12345-6789-01',
	'xyzabc123nonexistent'
] as const;

export const TEST_SIGS = [
	'1 tablet twice daily',
	'2 tablets daily',
	'1 tablet 3 times daily',
	'1 tablet daily'
] as const;

export const TEST_DAYS_SUPPLY = [30, 60, 90, 7, 14] as const;

export const TEST_QUANTITIES = [60, 90, 30, 14, 28] as const;

export const TEST_MANUAL_DOSES = [2, 3, 1, 4] as const;

export function isDevMode(): boolean {
	return import.meta.env.DEV;
}
