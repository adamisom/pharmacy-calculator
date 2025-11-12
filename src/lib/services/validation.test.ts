import { describe, it, expect } from 'vitest';
import { validatePrescriptionInput } from './validation';
import type { PrescriptionInput } from '$lib/types';

describe('validation service', () => {
	it('should validate correct input', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: 'Aspirin',
			sig: '1 tablet twice daily',
			daysSupply: 30
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should reject empty drug name', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: '',
			sig: '1 tablet twice daily',
			daysSupply: 30
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Drug name or NDC is required');
	});

	it('should reject empty SIG', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: 'Aspirin',
			sig: '',
			daysSupply: 30
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Prescription instructions (SIG) are required');
	});

	it('should reject days supply below minimum', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: 'Aspirin',
			sig: '1 tablet twice daily',
			daysSupply: 0
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('at least 1 day'))).toBe(true);
	});

	it('should reject days supply above maximum', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: 'Aspirin',
			sig: '1 tablet twice daily',
			daysSupply: 400
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('cannot exceed 365'))).toBe(true);
	});

	it('should validate reverse calculation with quantity', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: 'Aspirin',
			sig: '1 tablet twice daily',
			daysSupply: null,
			totalQuantity: 60
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(true);
	});

	it('should reject reverse calculation without quantity', () => {
		const input: PrescriptionInput = {
			drugNameOrNDC: 'Aspirin',
			sig: '1 tablet twice daily',
			daysSupply: null
		};
		const result = validatePrescriptionInput(input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('total quantity must be provided'))).toBe(true);
	});
});
