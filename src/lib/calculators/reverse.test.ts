import { describe, it, expect } from 'vitest';
import { calculateDaysSupplyFromQuantity } from './reverse';
import type { ParsedSIG } from '$lib/types';

describe('reverse calculator', () => {
	it('should calculate days supply correctly', () => {
		const sig: ParsedSIG = {
			dosesPerDay: 2,
			unitsPerDose: 1,
			unitType: 'tablet'
		};
		// 60 units, 2 doses/day, 1 unit/dose = 30 days
		expect(calculateDaysSupplyFromQuantity(sig, 60)).toBe(30);
	});

	it('should handle multiple units per dose', () => {
		const sig: ParsedSIG = {
			dosesPerDay: 2,
			unitsPerDose: 2,
			unitType: 'tablet'
		};
		// 120 units, 2 doses/day, 2 units/dose = 30 days
		expect(calculateDaysSupplyFromQuantity(sig, 120)).toBe(30);
	});

	it('should round down (conservative approach)', () => {
		const sig: ParsedSIG = {
			dosesPerDay: 2,
			unitsPerDose: 1,
			unitType: 'tablet'
		};
		// 65 units, 2 doses/day, 1 unit/dose = 32.5 days, should round down to 32
		expect(calculateDaysSupplyFromQuantity(sig, 65)).toBe(32);
	});

	it('should handle zero quantity', () => {
		const sig: ParsedSIG = {
			dosesPerDay: 2,
			unitsPerDose: 1,
			unitType: 'tablet'
		};
		expect(calculateDaysSupplyFromQuantity(sig, 0)).toBe(0);
	});

	it('should return 0 for invalid SIG (zero doses per day)', () => {
		const sig: ParsedSIG = {
			dosesPerDay: 0,
			unitsPerDose: 1,
			unitType: 'tablet'
		};
		expect(calculateDaysSupplyFromQuantity(sig, 60)).toBe(0);
	});

	it('should return 0 for invalid SIG (zero units per dose)', () => {
		const sig: ParsedSIG = {
			dosesPerDay: 2,
			unitsPerDose: 0,
			unitType: 'tablet'
		};
		expect(calculateDaysSupplyFromQuantity(sig, 60)).toBe(0);
	});
});
