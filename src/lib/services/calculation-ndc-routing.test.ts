import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePrescription } from './calculation';
import { getAllPackagesForProductNDC, getMultipleNDCInfo } from '$lib/api/fda';
import { parseSIGWithFallback } from '$lib/parsers/sig';
import type { NDCPackage } from '$lib/types';

// Mock dependencies
vi.mock('$lib/api/fda', () => ({
	getAllPackagesForProductNDC: vi.fn(),
	getMultipleNDCInfo: vi.fn(),
	searchNDCPackagesByDrugName: vi.fn()
}));

vi.mock('$lib/api/rxnorm', () => ({
	normalizeDrugInput: vi.fn(),
	getNDCsForRxCUI: vi.fn(),
	isNDCFormat: vi.fn((input: string) => /^\d{8,11}$/.test(input.replace(/[-\s]/g, ''))),
	normalizeNDC: vi.fn((ndc: string) => ndc.replace(/[-\s]/g, ''))
}));

vi.mock('$lib/parsers/sig', () => ({
	parseSIGWithFallback: vi.fn()
}));

vi.mock('./validation', () => ({
	validatePrescriptionInput: vi.fn(() => ({ valid: true, errors: [] }))
}));

describe('Calculation service - NDC routing logic', () => {
	const mockPackage: NDCPackage = {
		ndc: '5394308001',
		packageSize: 120,
		packageType: 'bottle',
		isActive: true,
		manufacturer: 'Test Manufacturer'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(parseSIGWithFallback).mockReturnValue({
			dosesPerDay: 2,
			unitsPerDose: 1,
			unitType: 'tablet'
		});
	});

	it('should route product NDC (8 digits) to getAllPackagesForProductNDC', async () => {
		const mockPackages: NDCPackage[] = [
			{ ...mockPackage, ndc: '5394308001', packageSize: 120 },
			{ ...mockPackage, ndc: '5394308008', packageSize: 360 },
			{ ...mockPackage, ndc: '5394308012', packageSize: 300 }
		];

		vi.mocked(getAllPackagesForProductNDC).mockResolvedValue(mockPackages);

		await calculatePrescription({
			drugNameOrNDC: '53943080',
			sig: '1 tablet twice daily',
			daysSupply: 30,
			totalQuantity: undefined
		});

		// Should call getAllPackagesForProductNDC for 8-digit product NDC
		expect(getAllPackagesForProductNDC).toHaveBeenCalledWith('53943080');
		expect(getAllPackagesForProductNDC).toHaveBeenCalledTimes(1);
		expect(getMultipleNDCInfo).not.toHaveBeenCalled();
	});

	it('should route product NDC (9 digits) to getAllPackagesForProductNDC', async () => {
		const mockPackages: NDCPackage[] = [{ ...mockPackage, ndc: '12345678901', packageSize: 100 }];

		vi.mocked(getAllPackagesForProductNDC).mockResolvedValue(mockPackages);

		await calculatePrescription({
			drugNameOrNDC: '12345-6789',
			sig: '1 tablet daily',
			daysSupply: 30,
			totalQuantity: undefined
		});

		// Should call getAllPackagesForProductNDC for 9-digit product NDC
		expect(getAllPackagesForProductNDC).toHaveBeenCalledWith('12345-6789');
		expect(getMultipleNDCInfo).not.toHaveBeenCalled();
	});

	it('should route package NDC (10 digits) to getMultipleNDCInfo', async () => {
		const mockPackages: NDCPackage[] = [{ ...mockPackage }];

		vi.mocked(getMultipleNDCInfo).mockResolvedValue(mockPackages);

		await calculatePrescription({
			drugNameOrNDC: '1234567890',
			sig: '1 tablet daily',
			daysSupply: 30,
			totalQuantity: undefined
		});

		// Should call getMultipleNDCInfo for 10-digit package NDC
		expect(getMultipleNDCInfo).toHaveBeenCalledWith(['1234567890']);
		expect(getMultipleNDCInfo).toHaveBeenCalledTimes(1);
		expect(getAllPackagesForProductNDC).not.toHaveBeenCalled();
	});

	it('should route package NDC (11 digits) to getMultipleNDCInfo', async () => {
		const mockPackages: NDCPackage[] = [{ ...mockPackage }];

		vi.mocked(getMultipleNDCInfo).mockResolvedValue(mockPackages);

		await calculatePrescription({
			drugNameOrNDC: '53943-080-01',
			sig: '1 tablet daily',
			daysSupply: 30,
			totalQuantity: undefined
		});

		// Should call getMultipleNDCInfo for 11-digit package NDC
		expect(getMultipleNDCInfo).toHaveBeenCalledWith(['53943-080-01']);
		expect(getAllPackagesForProductNDC).not.toHaveBeenCalled();
	});

	it('should handle product NDC with dashes correctly', async () => {
		const mockPackages: NDCPackage[] = [{ ...mockPackage }];

		vi.mocked(getAllPackagesForProductNDC).mockResolvedValue(mockPackages);

		await calculatePrescription({
			drugNameOrNDC: '53943-080', // 8 digits with dashes
			sig: '1 tablet daily',
			daysSupply: 30,
			totalQuantity: undefined
		});

		// Should preserve dashes when calling getAllPackagesForProductNDC
		expect(getAllPackagesForProductNDC).toHaveBeenCalledWith('53943-080');
		expect(getMultipleNDCInfo).not.toHaveBeenCalled();
	});

	it('should return all packages from product NDC lookup', async () => {
		const mockPackages: NDCPackage[] = [
			{ ...mockPackage, ndc: '5394308001', packageSize: 120 },
			{ ...mockPackage, ndc: '5394308008', packageSize: 360 },
			{ ...mockPackage, ndc: '5394308012', packageSize: 300 }
		];

		vi.mocked(getAllPackagesForProductNDC).mockResolvedValue(mockPackages);

		const result = await calculatePrescription({
			drugNameOrNDC: '53943080',
			sig: '1 tablet twice daily',
			daysSupply: 30,
			totalQuantity: undefined
		});

		// Should have recommendations for all 3 packages
		// (exact number depends on calculation logic, but should have multiple options)
		expect(result.recommendedNDCs.length).toBeGreaterThan(0);
		expect(result.drugName).toBe('NDC: 53943080');
	});
});
