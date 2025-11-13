import { describe, it, expect } from 'vitest';
import {
	teaspoonsToMl,
	tablespoonsToMl,
	fluidOuncesToMl,
	insulinUnitsToMl,
	mlToInsulinUnits,
	parseVolumeToMl,
	INSULIN_CONCENTRATIONS
} from './unit-conversions';

describe('Unit conversions', () => {
	describe('Volume conversions', () => {
		it('should convert teaspoons to ml', () => {
			expect(teaspoonsToMl(1)).toBe(5);
			expect(teaspoonsToMl(2)).toBe(10);
			expect(teaspoonsToMl(0.5)).toBe(2.5);
		});

		it('should convert tablespoons to ml', () => {
			expect(tablespoonsToMl(1)).toBe(15);
			expect(tablespoonsToMl(2)).toBe(30);
		});

		it('should convert fluid ounces to ml', () => {
			expect(fluidOuncesToMl(1)).toBe(30);
			expect(fluidOuncesToMl(2)).toBe(60);
		});

		it('should parse volume strings to ml', () => {
			expect(parseVolumeToMl(1, 'teaspoon')).toBe(5);
			expect(parseVolumeToMl(1, 'tsp')).toBe(5);
			expect(parseVolumeToMl(1, 'tablespoon')).toBe(15);
			expect(parseVolumeToMl(1, 'tbsp')).toBe(15);
			expect(parseVolumeToMl(1, 'fluid ounce')).toBe(30);
			expect(parseVolumeToMl(1, 'fl oz')).toBe(30);
			expect(parseVolumeToMl(100, 'ml')).toBe(100);
			expect(parseVolumeToMl(100, 'milliliter')).toBe(100);
		});

		it('should return value as-is for unknown units', () => {
			expect(parseVolumeToMl(100, 'unknown')).toBe(100);
		});
	});

	describe('Insulin conversions', () => {
		it('should convert insulin units to ml (U-100)', () => {
			expect(insulinUnitsToMl(100)).toBe(1); // 100 units = 1 ml at U-100
			expect(insulinUnitsToMl(50)).toBe(0.5);
			expect(insulinUnitsToMl(200)).toBe(2);
		});

		it('should convert insulin units to ml (U-200)', () => {
			expect(insulinUnitsToMl(200, INSULIN_CONCENTRATIONS.U200)).toBe(1);
			expect(insulinUnitsToMl(100, INSULIN_CONCENTRATIONS.U200)).toBe(0.5);
		});

		it('should convert ml to insulin units (U-100)', () => {
			expect(mlToInsulinUnits(1)).toBe(100);
			expect(mlToInsulinUnits(0.5)).toBe(50);
			expect(mlToInsulinUnits(2)).toBe(200);
		});

		it('should convert ml to insulin units (U-200)', () => {
			expect(mlToInsulinUnits(1, INSULIN_CONCENTRATIONS.U200)).toBe(200);
			expect(mlToInsulinUnits(0.5, INSULIN_CONCENTRATIONS.U200)).toBe(100);
		});
	});
});
