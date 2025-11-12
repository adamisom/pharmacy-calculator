# User Guide

## Overview

The NDC Calculator helps pharmacists and pharmacy technicians match prescriptions with valid National Drug Codes (NDCs) and calculate correct dispense quantities.

## Quick Start

1. **Enter Drug Information**
   - Enter drug name (e.g., "Aspirin") or NDC code (e.g., "12345-678-90")
   - The system will automatically normalize drug names using RxNorm

2. **Enter Prescription Instructions (SIG)**
   - Enter the prescription instructions as written
   - Examples: "1 tablet twice daily", "2 capsules by mouth every 8 hours"
   - The system will parse common patterns automatically

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

### Warnings

The system flags:
- **Inactive NDCs**: NDCs that are no longer active in the FDA directory
- **High Overfill**: When recommended packages exceed needed quantity by >10%
- **Underfill**: When available packages don't meet the required quantity

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
A: The system handles common patterns well. For complex instructions, use the manual override.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Support

For technical issues, refer to the [API Documentation](./API.md) or create an issue in the repository.

