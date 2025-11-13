# Steps to Verify Metformin Overfill Test

## Test Case

- **Drug**: `metformin`
- **SIG**: `1 tablet daily`
- **Days Supply**: `5`
- **Expected Quantity**: 5 tablets
- **Expected Overfill Warning**: >10% (should be ~500% if smallest package is 30 tablets)

## Step 1: Check FDA API Response

Run this command to see what packages FDA returns for metformin:

```bash
curl -s "https://api.fda.gov/drug/ndc.json?search=generic_name:metformin&limit=10" | jq '.results[] | {product_ndc, packaging: .packaging[0].description, package_ndc: .packaging[0].package_ndc}'
```

**Note:** The `-s` flag makes curl "silent" (hides progress bars). If you want to see errors, remove `-s` or use `-v` for verbose output.

**What to look for:**

- Package descriptions (e.g., "30 TABLET in 1 BOTTLE")
- Smallest package size available

## Step 2: Run the Calculation in the App

1. Open the app in your browser
2. Open browser DevTools (F12) and go to Console tab
3. Enter:
   - Drug: `metformin`
   - SIG: `1 tablet daily`
   - Days Supply: `5`
4. Click "Calculate"

## Step 3: Check Console Logs

Look for these log messages in the console:

### FDA Search Logs:

```
[FDA] Searching for drug: metformin
[FDA] Search response count: X
[FDA] Extracted unique packages: X [list of NDCs with package sizes]
```

**What to check:**

- Are packages being found?
- What package sizes are extracted? (Should be numbers like 30, 60, 100, not 1)
- If you see `size: 1`, the extraction is failing

### Calculation Logs:

```
[CALC] Selecting NDCs - Total quantity needed: 5 Available packages: [...]
[CALC] Selected recommendations: [...]
```

**What to check:**

- What packages are available?
- What package was selected?
- What is the overfill percentage? (Should be >10% to trigger warning)

## Step 4: Check Server Logs

If running locally, check your server terminal for the same logs.

## Step 5: Manual Verification

If a package shows `size: 30`:

- Need: 5 tablets
- Package: 30 tablets
- Packages needed: 1 (always round up)
- Overfill: (30 - 5) / 5 \* 100 = **500%**

This should definitely trigger the >10% warning threshold.

## Step 6: Test with Specific NDC

If metformin search isn't working, try a direct NDC:

- **NDC**: `63187-239` (30 tablets based on FDA API)
- **SIG**: `1 tablet daily`
- **Days**: `5`
- **Expected**: 500% overfill warning

## Step 7: Check for Extraction Failures

If packages show `packageSize: 1`, look for console warnings:

```
[FDA] Could not extract package size from description: ...
```

This means the description format isn't being parsed correctly.

## Step 8: Verify Warning Display

Even if overfill is calculated correctly, check:

- Is the warning badge displayed in the UI?
- Is the overfill percentage shown?
- Check the `warnings` array in the calculation result

## Common Issues

1. **Package size extraction failing**: Description format might be unexpected
2. **No packages found**: FDA API search might be returning empty results
3. **All packages inactive**: System might filter them out
4. **Warning not displayed**: UI might not be showing warnings correctly

## Expected Result

For metformin with 5 days supply:

- Should find packages (30, 60, 100+ tablets)
- Should select smallest package (likely 30 tablets)
- Should calculate overfill: (30 - 5) / 5 \* 100 = 500%
- Should display overfill warning badge
