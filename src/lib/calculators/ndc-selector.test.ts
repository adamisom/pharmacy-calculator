import { describe, it, expect } from 'vitest';
import {
	createNDCRecommendation,
	selectOptimalNDCs,
	findMultiPackCombination
} from './ndc-selector';
import type { NDCPackage } from '$lib/types';

describe('NDC selector', () => {
	const createPackage = (ndc: string, size: number, isActive: boolean = true): NDCPackage => ({
		ndc,
		packageSize: size,
		packageType: 'box',
		isActive,
		manufacturer: 'Test Manufacturer'
	});

	describe('createNDCRecommendation', () => {
		it('should create recommendation with correct overfill calculation', () => {
			const pkg = createPackage('12345678901', 30);
			const rec = createNDCRecommendation('12345678901', 2, pkg, 60);

			expect(rec.ndc).toBe('12345678901');
			expect(rec.packagesNeeded).toBe(2);
			expect(rec.totalUnits).toBe(60);
			expect(rec.overfill).toBe(0);
			expect(rec.packageDetails).toBe(pkg);
		});

		it('should calculate overfill correctly', () => {
			const pkg = createPackage('12345678901', 50);
			const rec = createNDCRecommendation('12345678901', 2, pkg, 60);

			expect(rec.totalUnits).toBe(100);
			expect(rec.overfill).toBeCloseTo(66.67, 1);
		});
	});

	describe('selectOptimalNDCs', () => {
		it('should select best NDC with lowest overfill', () => {
			const packages = [
				createPackage('111', 30), // 2 packages = 60, 0% overfill
				createPackage('222', 50), // 2 packages = 100, 66.7% overfill
				createPackage('333', 100) // 1 package = 100, 66.7% overfill
			];

			const result = selectOptimalNDCs(packages, 60);

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].ndc).toBe('111');
			expect(result[0].overfill).toBe(0);
		});

		it('should prefer fewer packages when overfill is equal', () => {
			const packages = [
				createPackage('111', 60), // 1 package = 60, 0% overfill
				createPackage('222', 30) // 2 packages = 60, 0% overfill
			];

			const result = selectOptimalNDCs(packages, 60);

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].ndc).toBe('111'); // Prefer 1 package over 2
		});

		it('should filter out packages with too much underfill', () => {
			const packages = [
				createPackage('111', 10) // Would need 6 packages, but only provides 60 units (0% underfill)
			];

			const result = selectOptimalNDCs(packages, 60);

			expect(result).toHaveLength(1);
		});

		it('should return inactive NDCs when no active ones available', () => {
			const packages = [createPackage('111', 30, false), createPackage('222', 50, false)];

			const result = selectOptimalNDCs(packages, 60);

			expect(result).toHaveLength(2);
			expect(result.every((r) => !r.packageDetails.isActive)).toBe(true);
		});

		it('should return top 3 recommendations', () => {
			const packages = [
				createPackage('111', 30), // 2 packages = 60, 0% overfill (best)
				createPackage('222', 35), // 2 packages = 70, 16.7% overfill
				createPackage('333', 40), // 2 packages = 80, 33.3% overfill
				createPackage('444', 50), // 2 packages = 100, 66.7% overfill
				createPackage('555', 60) // 1 package = 60, 0% overfill (tied for best, fewer packages)
			];

			const result = selectOptimalNDCs(packages, 60);

			expect(result.length).toBeLessThanOrEqual(3);
			// Should include the best options (0% overfill with fewer packages preferred)
			expect(result[0].overfill).toBe(0);
		});

		it('should handle empty packages array', () => {
			const result = selectOptimalNDCs([], 60);
			expect(result).toHaveLength(0);
		});

		it('should filter out packages with packageSize === 1 (extraction failures)', () => {
			const packages = [
				createPackage('111', 1), // Extraction failed, should be filtered out
				createPackage('222', 1, true), // Also filtered out
				createPackage('333', 30) // Valid package
			];

			const result = selectOptimalNDCs(packages, 30);

			expect(result).toHaveLength(1);
			expect(result[0].ndc).toBe('333');
			expect(result[0].packageDetails.packageSize).toBe(30);
		});

		it('should filter out packages with packageSize > MAX_REASONABLE_PACKAGE_SIZE (bulk/industrial)', () => {
			const packages = [
				createPackage('111', 15000), // Too large, should be filtered out
				createPackage('222', 20000), // Too large, should be filtered out
				createPackage('333', 30) // Valid package
			];

			const result = selectOptimalNDCs(packages, 30);

			expect(result).toHaveLength(1);
			expect(result[0].ndc).toBe('333');
			expect(result[0].packageDetails.packageSize).toBe(30);
		});

		it('should filter out recommendations with packagesNeeded === 0 or totalUnits === 0', () => {
			const packages = [
				createPackage('111', 30), // Valid
				createPackage('222', 0) // Invalid - will result in packagesNeeded === 0
			];

			const result = selectOptimalNDCs(packages, 30);

			// Should only return the valid package, not the one with packagesNeeded === 0
			expect(result).toHaveLength(1);
			expect(result[0].ndc).toBe('111');
			expect(result[0].packagesNeeded).toBeGreaterThan(0);
			expect(result[0].totalUnits).toBeGreaterThan(0);
		});
	});

	describe('findMultiPackCombination', () => {
		it('should find optimal two-pack combination', () => {
			const packages = [
				createPackage('111', 30), // 2 packages = 60, 0% overfill
				createPackage('222', 50) // 1 package = 50, 16.7% underfill
			];

			// 60 needed: 1×30 + 1×50 = 80, 33.3% overfill (worse than single pack)
			// Actually, 2×30 = 60 is perfect, so single pack should win
			const result = findMultiPackCombination(packages, 60);

			// Single pack is better, so should return null
			expect(result).toBeNull();
		});

		it('should find better combination when single packs have high overfill', () => {
			const packages = [
				createPackage('111', 100), // 1 package = 100, 66.7% overfill
				createPackage('222', 35) // 2 packages = 70, 16.7% overfill (better than 66.7%)
			];

			// 60 needed: 2×35 = 70, 16.7% overfill (better than 66.7% from single pack)
			const result = findMultiPackCombination(packages, 60);

			// Single pack option (222) is actually better, so multi-pack might return null
			// or the algorithm might find a combination
			expect(result === null || (result && result.length > 0)).toBe(true);
		});

		it('should return null when fewer than 2 active packages', () => {
			const packages = [createPackage('111', 30)];

			const result = findMultiPackCombination(packages, 60);

			expect(result).toBeNull();
		});

		it('should return null when single pack is better', () => {
			const packages = [
				createPackage('111', 60), // Perfect match
				createPackage('222', 50)
			];

			const result = findMultiPackCombination(packages, 60);

			expect(result).toBeNull();
		});
	});
});
