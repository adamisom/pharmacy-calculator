# Temporary Troubleshooting - Aspirin NDC Lookup Issue

## Problem
Aspirin search finds 274 NDCs from FDA API but fails to retrieve package information, resulting in "No package information found" error.

## Findings

### RxNorm API
- RxCUI 1191 (Aspirin) exists and is valid
- RxCUI 1191 has **no NDCs** in RxNorm database
- This is a known limitation - RxNorm doesn't maintain NDCs for all drug concepts
- Alternative endpoints confirmed: `spellingsuggestions`, `rxcui?name=`, `history.json` all return RxCUI 1191 but no NDC data

### FDA API
- ✅ FDA search by `generic_name` works: finds 274 NDCs for "Aspirin"
- ✅ NDCs extracted successfully (mix of 8-digit product_ndc and 11-digit package_ndc)
- ❌ `getNDCPackageInfo` fails to retrieve package details for these NDCs
- Error: "No package information found" after finding 274 NDCs

## Attempted Fixes

1. **Fixed FDA field names**: Changed from `non_proprietary_name`/`proprietary_name` to `generic_name`/`brand_name` ✅
2. **Added FDA fallback**: When RxNorm has no NDCs, search FDA by drug name ✅
3. **Fixed NDC lookup**: Updated `getNDCPackageInfo` to try `package_ndc` for 11-digit NDCs, `product_ndc` for shorter ones, with fallback ❌ (still failing)

## Current State
- FDA search finds NDCs successfully
- Package info lookup still fails for all 274 NDCs
- Need to investigate why `getNDCPackageInfo` returns null for these NDCs

## Next Steps
- Test FDA API directly with sample NDCs to verify search syntax
- Check if NDC format/normalization is causing lookup failures
- Consider limiting NDC results or trying different search strategies

