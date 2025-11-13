# Commands to Check Specific NDCs

## Check if NDC exists in FDA API

For the NDCs you're seeing (06437400301, 06437400302, 06437400303), try these commands:

```bash
# Try as package_ndc (11 digits, no dashes)
curl -s "https://api.fda.gov/drug/ndc.json?search=package_ndc:06437400301" | jq '.'

# Try as product_ndc with dashes (0643-7400-301)
curl -s "https://api.fda.gov/drug/ndc.json?search=product_ndc:\"0643-7400-301\"" | jq '.'

# Try as product_ndc without dashes
curl -s "https://api.fda.gov/drug/ndc.json?search=product_ndc:06437400301" | jq '.'
```

## Check what metformin packages FDA actually returns

```bash
curl -s "https://api.fda.gov/drug/ndc.json?search=generic_name:metformin&limit=10" | jq '.results[] | {product_ndc, packaging: .packaging[0].description, package_ndc: .packaging[0].package_ndc}' | head -30
```

## What to look for in console logs

When you run the calculation, check for:

1. `[FDA] Extracted unique packages:` - shows what packages were found
2. `[FDA] Package size extraction failed` - warnings if extraction is failing
3. `[CALC] Sample package details:` - shows the actual package objects with their sizes

If package sizes are showing as `1`, that means extraction failed and it's using the default. This would explain why you need 5 packages of size 1 = 5 tablets total with 0% overfill.
