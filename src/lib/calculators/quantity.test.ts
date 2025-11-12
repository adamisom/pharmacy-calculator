import { describe, it, expect } from 'vitest';
import {
	calculateTotalQuantityNeeded,
	calculatePackagesNeeded,
	calculateOverfill,
	calculateUnderfill
} from './quantity';
import type { ParsedSIG } from '$lib/types';

describe('quantity calculator', () => {
	describe('calculateTotalQuantityNeeded', () => {
		it('should calculate correctly for simple case', () => {
			const sig: ParsedSIG = {
				dosesPerDay: 2,
				unitsPerDose: 1,
				unitType: 'tablet'
			};
			expect(calculateTotalQuantityNeeded(sig, 30)).toBe(60);
		});

		it('should handle multiple units per dose', () => {
			const sig: ParsedSIG = {
				dosesPerDay: 2,
				unitsPerDose: 2,
				unitType: 'tablet'
			};
			expect(calculateTotalQuantityNeeded(sig, 30)).toBe(120);
		});

		it('should handle zero days supply', () => {
			const sig: ParsedSIG = {
				dosesPerDay: 2,
				unitsPerDose: 1,
				unitType: 'tablet'
			};
			expect(calculateTotalQuantityNeeded(sig, 0)).toBe(0);
		});
	});

	describe('calculatePackagesNeeded', () => {
		it('should round up to nearest package', () => {
			expect(calculatePackagesNeeded(60, 30)).toBe(2);
			expect(calculatePackagesNeeded(61, 30)).toBe(3);
			expect(calculatePackagesNeeded(59, 30)).toBe(2);
		});

		it('should handle perfect matches', () => {
			expect(calculatePackagesNeeded(60, 60)).toBe(1);
			expect(calculatePackagesNeeded(120, 60)).toBe(2);
		});

		it('should handle edge cases', () => {
			expect(calculatePackagesNeeded(0, 30)).toBe(0);
			expect(calculatePackagesNeeded(1, 30)).toBe(1);
		});
	});

	describe('calculateOverfill', () => {
		it('should calculate overfill percentage correctly', () => {
			// 60 needed, 2 packages of 30 = 0% overfill
			expect(calculateOverfill(60, 2, 30)).toBe(0);

			// 60 needed, 1 package of 100 = 66.67% overfill
			const overfill = calculateOverfill(60, 1, 100);
			expect(overfill).toBeCloseTo(66.67, 1);
		});

		it('should return 0 for zero quantity', () => {
			expect(calculateOverfill(0, 1, 30)).toBe(0);
		});
	});

	describe('calculateUnderfill', () => {
		it('should calculate underfill when packages insufficient', () => {
			// 60 needed, 1 package of 30 = 50% underfill
			expect(calculateUnderfill(60, 1, 30)).toBe(50);
		});

		it('should return 0 when no underfill', () => {
			expect(calculateUnderfill(60, 2, 30)).toBe(0);
		});

		it('should return 100 for zero packages', () => {
			expect(calculateUnderfill(60, 0, 30)).toBe(100);
		});
	});
});
