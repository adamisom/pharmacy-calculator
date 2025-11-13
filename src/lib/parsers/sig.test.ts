import { describe, it, expect } from 'vitest';
import { parseSIG, parseSIGWithFallback } from './sig';

describe('SIG parser', () => {
	describe('parseSIG', () => {
		it('should parse simple daily pattern', () => {
			const result = parseSIG('1 tablet daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1);
			expect(result?.unitsPerDose).toBe(1);
			expect(result?.unitType).toBe('tablet');
		});

		it('should parse twice daily pattern', () => {
			const result = parseSIG('1 tablet twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
			expect(result?.unitsPerDose).toBe(1);
		});

		it('should parse BID abbreviation', () => {
			const result = parseSIG('1 tablet BID');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
		});

		it('should parse every X hours pattern', () => {
			const result = parseSIG('1 tablet every 6 hours');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(4); // 24/6 = 4
			expect(result?.unitsPerDose).toBe(1);
		});

		it('should parse range pattern and use higher value', () => {
			const result = parseSIG('1-2 tablet daily');
			expect(result).not.toBeNull();
			expect(result?.unitsPerDose).toBe(2); // Uses higher value
		});

		it('should return null for unparseable SIG', () => {
			const result = parseSIG('take as directed');
			expect(result).toBeNull();
		});

		// Liquid medication patterns
		it('should parse ml daily pattern', () => {
			const result = parseSIG('5 ml daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1);
			expect(result?.unitsPerDose).toBe(5);
			expect(result?.unitType).toBe('ml');
		});

		it('should parse ml twice daily pattern', () => {
			const result = parseSIG('10 ml twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
			expect(result?.unitsPerDose).toBe(10);
			expect(result?.unitType).toBe('ml');
		});

		it('should parse teaspoon pattern and convert to ml', () => {
			const result = parseSIG('1 teaspoon daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1);
			expect(result?.unitsPerDose).toBe(5); // 1 tsp = 5 ml
			expect(result?.unitType).toBe('ml');
		});

		it('should parse tablespoon pattern and convert to ml', () => {
			const result = parseSIG('1 tablespoon twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
			expect(result?.unitsPerDose).toBe(15); // 1 tbsp = 15 ml
			expect(result?.unitType).toBe('ml');
		});

		// Insulin patterns
		it('should parse insulin units daily pattern', () => {
			const result = parseSIG('10 units daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1);
			expect(result?.unitsPerDose).toBe(10);
			expect(result?.unitType).toBe('unit');
		});

		it('should parse insulin units before meals pattern', () => {
			const result = parseSIG('15 units before each meal');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(3); // 3 meals per day
			expect(result?.unitsPerDose).toBe(15);
			expect(result?.unitType).toBe('unit');
		});

		it('should parse insulin units at bedtime pattern', () => {
			const result = parseSIG('20 units at bedtime');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1);
			expect(result?.unitsPerDose).toBe(20);
			expect(result?.unitType).toBe('unit');
		});

		it('should parse insulin units with injection route', () => {
			const result = parseSIG('10 units subcutaneously twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
			expect(result?.unitsPerDose).toBe(10);
			expect(result?.unitType).toBe('unit');
		});

		// Inhaler patterns
		it('should parse puff daily pattern', () => {
			const result = parseSIG('2 puffs daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1);
			expect(result?.unitsPerDose).toBe(2);
			expect(result?.unitType).toBe('puff');
		});

		it('should parse puff twice daily pattern', () => {
			const result = parseSIG('2 puffs twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
			expect(result?.unitsPerDose).toBe(2);
			expect(result?.unitType).toBe('puff');
		});

		it('should parse puff every X hours pattern', () => {
			const result = parseSIG('2 puffs every 6 hours');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(4); // 24/6 = 4
			expect(result?.unitsPerDose).toBe(2);
			expect(result?.unitType).toBe('puff');
		});

		it('should parse puff PRN pattern', () => {
			const result = parseSIG('2 puffs as needed');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(1); // Conservative estimate
			expect(result?.unitsPerDose).toBe(2);
			expect(result?.unitType).toBe('puff');
		});

		it('should parse actuation pattern', () => {
			const result = parseSIG('1 actuation twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosesPerDay).toBe(2);
			expect(result?.unitsPerDose).toBe(1);
			expect(result?.unitType).toBe('actuation');
		});
	});

	describe('parseSIGWithFallback', () => {
		it('should use manual override when provided', () => {
			const result = parseSIGWithFallback('unparseable text', 3);
			expect(result.dosesPerDay).toBe(3);
			expect(result.unitsPerDose).toBe(1);
		});

		it('should throw error when no fallback provided', () => {
			expect(() => parseSIGWithFallback('unparseable text')).toThrow();
		});

		it('should parse valid SIG without fallback', () => {
			const result = parseSIGWithFallback('1 tablet twice daily');
			expect(result.dosesPerDay).toBe(2);
		});
	});
});
