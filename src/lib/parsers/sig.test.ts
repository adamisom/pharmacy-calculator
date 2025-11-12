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
