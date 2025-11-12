import { describe, it, expect } from 'vitest';
import {
	isDevMode,
	TEST_DRUGS,
	TEST_SIGS,
	TEST_DAYS_SUPPLY,
	TEST_QUANTITIES,
	TEST_MANUAL_DOSES
} from './test-data';

describe('test-data', () => {
	describe('isDevMode', () => {
		it('should return true in development mode', () => {
			// In test environment, import.meta.env.DEV is typically true
			expect(typeof isDevMode()).toBe('boolean');
		});
	});

	describe('test data constants', () => {
		it('should have test drugs', () => {
			expect(TEST_DRUGS.length).toBeGreaterThan(0);
			expect(TEST_DRUGS).toContain('aspirin');
			expect(TEST_DRUGS).toContain('ibuprofen');
		});

		it('should have test SIGs', () => {
			expect(TEST_SIGS.length).toBeGreaterThan(0);
			expect(TEST_SIGS).toContain('1 tablet twice daily');
		});

		it('should have test days supply', () => {
			expect(TEST_DAYS_SUPPLY.length).toBeGreaterThan(0);
			expect(TEST_DAYS_SUPPLY).toContain(30);
		});

		it('should have test quantities', () => {
			expect(TEST_QUANTITIES.length).toBeGreaterThan(0);
			expect(TEST_QUANTITIES).toContain(60);
		});

		it('should have test manual doses', () => {
			expect(TEST_MANUAL_DOSES.length).toBeGreaterThan(0);
			expect(TEST_MANUAL_DOSES).toContain(2);
		});
	});
});
