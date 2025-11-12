export type PackageType =
	| 'bottle'
	| 'box'
	| 'inhaler'
	| 'vial'
	| 'syringe'
	| 'tube'
	| 'pack'
	| 'carton';
export type UnitType = 'tablet' | 'capsule' | 'ml' | 'unit' | 'puff' | 'actuation';

export interface PrescriptionInput {
	drugNameOrNDC: string;
	sig: string;
	daysSupply: number | null; // null if using reverse calculation
	totalQuantity?: number; // for reverse calculation
	manualDosesPerDay?: number; // manual override for SIG parsing
}

export interface NDCPackage {
	ndc: string;
	packageSize: number;
	packageType: PackageType;
	isActive: boolean;
	manufacturer: string;
}

export interface NDCRecommendation {
	ndc: string;
	packagesNeeded: number;
	totalUnits: number;
	overfill: number; // percentage
	packageDetails: NDCPackage;
}

export interface CalculationResult {
	rxcui: string;
	drugName: string;
	recommendedNDCs: NDCRecommendation[];
	totalQuantityNeeded: number;
	daysSupply: number;
	warnings: string[];
}

export interface ParsedSIG {
	dosesPerDay: number;
	unitsPerDose: number;
	unitType: UnitType;
}
