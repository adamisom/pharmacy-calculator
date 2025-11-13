import { describe, it, expect } from 'vitest';
import {
	extractPackageSize,
	findUnitMatches,
	findContainerMatches,
	calculateNestedPackageSize
} from './fda';
import { CALCULATION_THRESHOLDS, FDA_CONFIG } from '$lib/config';

describe('FDA package size extraction', () => {
	describe('findUnitMatches', () => {
		it('should find tablet counts', () => {
			expect(findUnitMatches('100 TABLET in 1 BOTTLE')).toEqual([100]);
			expect(findUnitMatches('30 TABLET')).toEqual([30]);
		});

		it('should find capsule counts', () => {
			expect(findUnitMatches('60 CAPSULE in 1 BOTTLE')).toEqual([60]);
		});

		it('should find multiple unit matches', () => {
			expect(findUnitMatches('30 TABLET / 10 CAPSULE')).toEqual([30, 10]);
		});

		it('should find ML units', () => {
			expect(findUnitMatches('100 ML in 1 BOTTLE')).toEqual([100]);
		});

		it('should return empty array for no matches', () => {
			expect(findUnitMatches('5 BOX in 1 CARTON')).toEqual([]);
		});
	});

	describe('findContainerMatches', () => {
		it('should find blister pack counts', () => {
			expect(findContainerMatches('6 BLISTER PACK in 1 BOX')).toEqual([6, 1]);
		});

		it('should find pouch counts', () => {
			expect(findContainerMatches('30 POUCH in 1 BOX')).toEqual([30, 1]);
		});

		it('should find box and carton counts', () => {
			expect(findContainerMatches('5 BOX in 1 CARTON')).toEqual([5, 1]);
		});

		it('should return empty array for no matches', () => {
			expect(findContainerMatches('100 TABLET in 1 BOTTLE')).toEqual([]);
		});
	});

	describe('calculateNestedPackageSize', () => {
		it('should calculate nested package size', () => {
			expect(calculateNestedPackageSize(6, 5)).toBe(30);
			expect(calculateNestedPackageSize(30, 1)).toBe(30);
		});

		it('should return null for container count <= 1', () => {
			expect(calculateNestedPackageSize(1, 5)).toBeNull();
			expect(calculateNestedPackageSize(0, 5)).toBeNull();
		});

		it('should return null for unreasonably large packages', () => {
			const tooLarge = CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE + 1;
			expect(calculateNestedPackageSize(100, tooLarge)).toBeNull();
		});

		it('should accept packages at the max reasonable size', () => {
			expect(calculateNestedPackageSize(100, 100)).toBe(
				CALCULATION_THRESHOLDS.MAX_REASONABLE_PACKAGE_SIZE
			);
		});
	});

	describe('extractPackageSize', () => {
		it('should extract simple package sizes', () => {
			expect(extractPackageSize('100 TABLET in 1 BOTTLE')).toBe(100);
			expect(extractPackageSize('60 CAPSULE in 1 BOTTLE')).toBe(60);
			expect(extractPackageSize('30 TABLET')).toBe(30);
		});

		it('should calculate nested package sizes', () => {
			expect(extractPackageSize('30 POUCH in 1 BOX / 1 TABLET in 1 POUCH')).toBe(30);
			expect(extractPackageSize('6 BLISTER PACK in 1 BOX / 5 TABLET in 1 BLISTER PACK')).toBe(30);
		});

		it('should return largest unit match when multiple found', () => {
			expect(extractPackageSize('10 TABLET / 5 CAPSULE')).toBe(10);
		});

		it('should return default for container-only descriptions', () => {
			expect(extractPackageSize('5 BOX in 1 CARTON')).toBe(FDA_CONFIG.DEFAULT_PACKAGE_SIZE);
		});

		it('should return default for malformed descriptions', () => {
			expect(extractPackageSize('UNKNOWN FORMAT')).toBe(FDA_CONFIG.DEFAULT_PACKAGE_SIZE);
			expect(extractPackageSize('')).toBe(FDA_CONFIG.DEFAULT_PACKAGE_SIZE);
		});

		it('should handle ML units', () => {
			expect(extractPackageSize('100 ML in 1 BOTTLE')).toBe(100);
		});

		it('should handle complex nested descriptions', () => {
			expect(extractPackageSize('10 BLISTER PACK / 10 TABLET in 1 BLISTER PACK')).toBe(100);
		});
	});
});
