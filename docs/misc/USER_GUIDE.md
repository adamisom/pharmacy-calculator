# User Guide

## Overview

The NDC Calculator helps pharmacists and pharmacy technicians match prescriptions with valid National Drug Codes (NDCs) and calculate correct dispense quantities.

## Quick Start

1. **Enter Drug Information**
   - Enter drug name (e.g., "Aspirin") or NDC code (e.g., "12345-678-90")
   - The system will automatically normalize drug names using RxNorm

2. **Enter Prescription Instructions (SIG)**
   - Enter the prescription instructions as written
   - **Tablets/Capsules**: "1 tablet twice daily", "2 capsules by mouth every 8 hours"
   - **Liquid Medications**: "5 ml twice daily", "1 teaspoon daily", "1 tablespoon twice daily"
   - **Insulin**: "10 units daily", "15 units before each meal", "20 units at bedtime"
   - **Inhalers**: "2 puffs twice daily", "1 actuation every 6 hours", "2 puffs as needed"
   - The system will parse common patterns automatically and convert units (e.g., teaspoons → ml)

3. **Enter Days Supply or Total Quantity**
   - **Days Supply**: Enter the number of days (e.g., 30)
   - **Total Quantity**: For reverse calculation, enter total quantity needed
   - You can only enter one or the other

4. **Optional: Manual Override**
   - If SIG parsing fails, you can manually enter doses per day
   - This overrides the automatic parsing

5. **Calculate**
   - Click "Calculate" to get NDC recommendations
   - The system will show optimal NDC packages that minimize overfill

## Understanding Results

### Recommended NDCs

Each recommendation shows:
- **NDC Code**: The National Drug Code
- **Packages Needed**: Number of packages to dispense
- **Total Units**: Total quantity in the recommended packages
- **Overfill**: Percentage of extra medication (warnings shown if >10%)
- **Package Details**: Size, type, manufacturer, and active status

### Understanding Package Size

**Package size** is the number of units (tablets, capsules, etc.) in a single package/bottle/box of medication.

**Examples:**
- "30 TABLET in 1 BOTTLE" → package size = 30 tablets
- "60 CAPSULE in 1 BOTTLE" → package size = 60 capsules
- "100 TABLET, FILM COATED in 1 BOTTLE" → package size = 100 tablets

**How Package Size is Determined:**

The system extracts package size from FDA API package descriptions by looking for patterns like:
- `(\d+) TABLET`
- `(\d+) CAPSULE`
- `(\d+) ML`

**Package Size Extraction Failures:**

If the system cannot extract a valid package size from the FDA description (e.g., bulk/industrial packages like "50 kg in 1 BAG" or malformed descriptions), it defaults to `packageSize: 1`.

**Why `packageSize === 1` Indicates a Problem:**

1. **Real packages are rarely size 1**: Most consumer medication packages contain 30, 60, 100, or more units
2. **Incorrect calculations**: A package size of 1 leads to wrong overfill calculations
   - Example: Need 5 tablets, package size incorrectly set to 1
   - System calculates: 5 packages needed (5 × 1 = 5 tablets)
   - Overfill: 0% (incorrect - hides real overfill)
3. **Hides real overfill warnings**: 
   - Example: Need 5 tablets, actual package is 30 tablets
   - Should show: 500% overfill warning
   - With size 1: Shows 0% overfill (no warning)

**System Behavior:**

The system automatically **excludes packages where `packageSize === 1`** from recommendations, as these represent extraction failures and are unreliable. Only packages with valid extracted package sizes are shown in results.

### Warnings

The system flags:
- **Inactive NDCs**: NDCs that are no longer active in the FDA directory
- **High Overfill**: When recommended packages exceed needed quantity by >10%
- **Underfill**: When available packages don't meet the required quantity

**Note on Inactive NDCs**: If no active NDCs are available for a medication, the system will show inactive NDCs with a warning. This allows you to see what packages exist, but you should verify with the manufacturer or use an alternative medication before dispensing inactive NDCs.

### JSON Output

For power users, expand the JSON output to see the complete calculation result in structured format.

## Common Scenarios

### Scenario 1: Standard Prescription
- Drug: "Lisinopril"
- SIG: "1 tablet once daily"
- Days Supply: 30
- Result: System finds optimal 30-count or 90-count bottles

### Scenario 2: Direct NDC Input
- Drug: "68180-123-01" (NDC format)
- SIG: "2 tablets twice daily"
- Days Supply: 14
- Result: System uses the specified NDC directly

### Scenario 3: Reverse Calculation
- Drug: "Metformin"
- SIG: "1 tablet twice daily"
- Total Quantity: 60
- Result: System calculates days supply (30 days)

### Scenario 4: Liquid Medication
- Drug: "Amoxicillin"
- SIG: "5 ml twice daily"
- Days Supply: 10
- Result: System calculates total ml needed (100 ml) and finds appropriate bottle sizes

### Scenario 5: Insulin
- Drug: "Insulin glargine"
- SIG: "20 units at bedtime"
- Days Supply: 30
- Result: System calculates total units needed and finds appropriate vial sizes

### Scenario 6: Inhaler
- Drug: "Albuterol"
- SIG: "2 puffs twice daily"
- Days Supply: 30
- Result: System calculates total puffs needed and finds appropriate inhaler sizes

## Tips

- Use full drug names for best matching results
- SIG parsing works best with standard formats (e.g., "X tablet(s) Y times daily")
- Check warnings for inactive NDCs before dispensing
- Use manual override if SIG parsing doesn't match your prescription

## FAQ

**Q: What if the drug name isn't found?**  
A: Try alternative names or spellings. You can also enter an NDC directly.

**Q: Can I use this for controlled substances?**  
A: This tool calculates quantities but doesn't validate controlled substance regulations. Always verify compliance separately.

**Q: What if all NDCs are inactive?**  
A: The system will flag this as a warning. You may need to contact the manufacturer or use an alternative drug.

**Q: How accurate is the SIG parsing?**  
A: The system handles common patterns well, including tablets, capsules, liquids (ml, teaspoons, tablespoons), insulin (units), and inhalers (puffs, actuations). For complex instructions, use the manual override.

**Q: Does the system convert between units?**  
A: Yes. The system automatically converts teaspoons to ml (1 tsp = 5 ml) and tablespoons to ml (1 tbsp = 15 ml) when parsing SIG instructions. Insulin units and inhaler puffs/actuations are handled directly.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Support

For technical issues, refer to the [API Documentation](./API.md) or create an issue in the repository.

