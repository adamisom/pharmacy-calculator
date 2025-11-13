import { describe, it, expect } from 'vitest';
import { normalizeNDC, isNDCFormat } from './rxnorm';

describe('RxNorm utilities', () => {
	describe('normalizeNDC', () => {
		it('should remove dashes and spaces', () => {
			// 10-digit NDC gets padded with leading zero
			expect(normalizeNDC('12345-678-90')).toBe('01234567890');
			expect(normalizeNDC('12345 678 90')).toBe('01234567890');
			// 11-digit NDC stays as is
			expect(normalizeNDC('12345-678-901')).toBe('12345678901');
		});

		it('should pad 10-digit NDC with leading zero', () => {
			expect(normalizeNDC('1234567890')).toBe('01234567890');
		});

		it('should leave 11-digit NDC unchanged', () => {
			expect(normalizeNDC('12345678901')).toBe('12345678901');
		});
	});

	describe('isNDCFormat', () => {
		it('should detect valid NDC formats', () => {
			expect(isNDCFormat('12345-678-90')).toBe(true);
			expect(isNDCFormat('1234567890')).toBe(true);
			expect(isNDCFormat('12345678901')).toBe(true);
			expect(isNDCFormat('12345 678 90')).toBe(true);
		});

		it('should reject non-NDC formats', () => {
			expect(isNDCFormat('Aspirin')).toBe(false);
			expect(isNDCFormat('123')).toBe(false);
			expect(isNDCFormat('1234567')).toBe(false); // 7 digits - too short
			expect(isNDCFormat('123456789012')).toBe(false); // 12 digits - too long
			expect(isNDCFormat('abc123')).toBe(false);
		});
	});
});
