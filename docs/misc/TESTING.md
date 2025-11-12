# Manual Testing Guide

This guide provides specific manual testing scenarios based on the PRD's functional requirements. Each test verifies a core feature or edge case.

## P0: Core Functionality Tests

### Test 1: Drug Name Input with RxNorm Normalization

**Requirement**: Normalize input to RxCUI using RxNorm API

**Steps**:
1. Enter drug name: `aspirin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- System queries RxNorm API to find RxCUI
- If RxNorm has NDCs, uses those; otherwise falls back to FDA search
- Returns valid NDC recommendations with package sizes
- No "drug not found" error

**Verify**:
- Console shows RxNorm API call
- Results show NDC(s) with package information
- Package sizes are extracted from FDA API descriptions

---

### Test 2: Direct NDC Input (Product NDC)

**Requirement**: Input drug name or NDC

**Steps**:
1. Enter NDC: `53943-080` (8-digit product NDC with dashes)
2. Enter SIG: `2 tablets daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- System recognizes input as NDC (not drug name)
- Queries FDA API directly using product_ndc field
- Returns package information for that NDC
- Calculates quantity: 2 tablets/day × 30 days = 60 tablets needed

**Verify**:
- No RxNorm API call is made
- FDA API query uses correct NDC format
- Results show correct package size and quantity needed

---

### Test 3: Direct NDC Input (Package NDC, 11-digit)

**Requirement**: Input drug name or NDC

**Steps**:
1. Enter NDC: `06076067360` (11-digit package NDC, no dashes)
2. Enter SIG: `1 tablet twice daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- System normalizes to 11 digits and queries FDA API
- Uses package_ndc field for 11-digit NDCs
- Returns package information
- Calculates: 2 tablets/day × 30 days = 60 tablets needed

**Verify**:
- NDC is correctly identified as package NDC
- FDA API query succeeds
- Package size is correct

---

### Test 4: SIG Parsing - Common Patterns

**Requirement**: Compute total quantity to dispense, respecting units

**Test Cases**:

#### 4a. "1 tablet daily"
- **Input**: Drug: `metformin`, SIG: `1 tablet daily`, Days: `30`
- **Expected**: 1 dose/day × 30 days = 30 tablets

#### 4b. "2 tablets twice daily"
- **Input**: Drug: `metformin`, SIG: `2 tablets twice daily`, Days: `30`
- **Expected**: 4 tablets/day × 30 days = 120 tablets

#### 4c. "1 tablet 3 times daily"
- **Input**: Drug: `metformin`, SIG: `1 tablet 3 times daily`, Days: `30`
- **Expected**: 3 tablets/day × 30 days = 90 tablets

#### 4d. "Take 2 tablets by mouth every 12 hours"
- **Input**: Drug: `metformin`, SIG: `Take 2 tablets by mouth every 12 hours`, Days: `30`
- **Expected**: 4 tablets/day × 30 days = 120 tablets

#### 4e. "1 capsule in the morning and 1 capsule at bedtime"
- **Input**: Drug: `omeprazole`, SIG: `1 capsule in the morning and 1 capsule at bedtime`, Days: `30`
- **Expected**: 2 capsules/day × 30 days = 60 capsules

**Verify**:
- Each SIG is correctly parsed to extract doses per day
- Quantity calculation is accurate
- No "SIG parsing failed" errors

---

### Test 5: SIG Parsing Failure - Manual Override

**Requirement**: For complex or ambiguous SIG instructions, provide manual override option

**Steps**:
1. Enter drug: `aspirin`
2. Enter SIG: `Take as directed by physician` (unparseable)
3. Enter days supply: `30`
4. Observe "SIG parsing failed" error
5. Enter manual override: `2` (doses per day)
6. Click "Calculate"

**Expected**:
- Error message: "We couldn't understand the prescription instructions"
- Actionable message: "Use the 'Manual Override: Doses Per Day' field below"
- Manual override field is visible and functional
- Calculation proceeds with manual override value: 2 doses/day × 30 days = 60 tablets

**Verify**:
- Error message is user-friendly and actionable
- Manual override field accepts numeric input
- Calculation uses manual override when provided

---

### Test 6: Quantity Calculation - Exact Match

**Requirement**: Compute total quantity to dispense, respecting units

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- Total quantity needed: 30 tablets
- System finds NDC packages (e.g., 30-tablet bottle, 60-tablet bottle)
- Selects optimal NDC that matches or minimizes overfill
- If exact match (30-tablet package), shows 1 package needed

**Verify**:
- Quantity calculation: 1 tablet/day × 30 days = 30 tablets
- NDC selection prioritizes exact match or minimal overfill
- Results show correct number of packages

---

### Test 7: Quantity Calculation - Overfill Warning

**Requirement**: Highlight overfills/underfills

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `5` (small quantity)
4. Click "Calculate"

**Expected**:
- Total quantity needed: 5 tablets
- System finds packages (likely 30-tablet or 60-tablet bottles)
- Selects smallest available package (e.g., 30-tablet bottle)
- Shows overfill warning: "Overfill: 25 tablets (500% over required quantity)"
- Warning badge is visible in UI

**Verify**:
- Overfill percentage is calculated correctly: (30 - 5) / 5 = 500%
- Warning threshold (>10%) is triggered
- Warning is visually distinct (badge/color)

---

### Test 8: Quantity Calculation - Underfill Warning

**Requirement**: Highlight overfills/underfills

**Steps**:
1. Enter drug: `aspirin`
2. Enter SIG: `2 tablets twice daily` (4 tablets/day)
3. Enter days supply: `90` (long-term supply)
4. Click "Calculate"

**Expected**:
- Total quantity needed: 360 tablets
- System finds packages and calculates combination
- If selected package(s) provide <95% of needed quantity, shows underfill warning
- Warning: "Underfill: X tablets short of required quantity"

**Verify**:
- Underfill threshold (<5%) is correctly calculated
- Warning appears when applicable
- System still recommends best available option

---

### Test 9: NDC Selection - Optimal Package Selection

**Requirement**: Select optimal NDC(s) that best match quantity and days' supply

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `60`
4. Click "Calculate"

**Expected**:
- Total quantity needed: 60 tablets
- System finds multiple NDC options (e.g., 30-tablet, 60-tablet, 90-tablet packages)
- Selects 60-tablet package (exact match) or combination that minimizes overfill
- If exact match exists, shows 1 package of 60-tablet NDC
- If no exact match, shows combination (e.g., 2 × 30-tablet packages)

**Verify**:
- Algorithm prioritizes exact match
- If no exact match, minimizes overfill
- Results show recommended NDC(s) with package count

---

### Test 10: NDC Selection - Multi-Pack Combination

**Requirement**: Select optimal NDC(s) that best match quantity and days' supply

**Steps**:
1. Enter drug: `aspirin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `45`
4. Click "Calculate"

**Expected**:
- Total quantity needed: 45 tablets
- System finds packages (e.g., 30-tablet, 60-tablet)
- Calculates best combination:
  - Option 1: 1 × 60-tablet (15 overfill)
  - Option 2: 2 × 30-tablet (15 overfill, but 2 packages)
- Selects option that minimizes overfill, then minimizes package count
- Shows recommendation: 1 × 60-tablet package OR 2 × 30-tablet packages

**Verify**:
- Multi-pack logic correctly calculates combinations
- Algorithm selects optimal combination
- Results clearly show package count and total units

---

### Test 11: Inactive NDC Detection

**Requirement**: Highlight inactive NDCs

**Steps**:
1. Find an inactive NDC (check FDA API for NDCs with `marketing_end_date` in the past)
2. Enter that NDC directly
3. Enter SIG: `1 tablet daily`
4. Enter days supply: `30`
5. Click "Calculate"

**Expected**:
- System retrieves NDC information from FDA API
- Detects `marketing_end_date` is in the past
- Shows warning badge: "Inactive NDC - This NDC is no longer marketed"
- Warning is visually distinct (e.g., red badge)
- Still provides calculation results, but with clear warning

**Verify**:
- `isNDCActive()` correctly checks `marketing_end_date`
- Warning appears for inactive NDCs
- Warning is actionable and clear

---

### Test 12: JSON Output Structure

**Requirement**: Provide structured JSON output

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"
5. View JSON output (if UI has toggle/view)

**Expected**:
- JSON structure matches `CalculationResult` interface:
  ```json
  {
    "rxcui": "string",
    "drugName": "string",
    "recommendedNDCs": [
      {
        "ndc": "string",
        "packagesNeeded": number,
        "totalUnits": number,
        "overfill": number,
        "packageDetails": {
          "ndc": "string",
          "packageSize": number,
          "packageType": "string",
          "isActive": boolean,
          "manufacturer": "string"
        }
      }
    ],
    "totalQuantityNeeded": number,
    "warnings": ["string"]
  }
  ```

**Verify**:
- All required fields are present
- Data types are correct
- Warnings array includes overfill/underfill/inactive NDC warnings

---

### Test 13: UI Summary Display

**Requirement**: Provide simple UI summary

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- UI displays:
  - Drug name (normalized)
  - Total quantity needed (30 tablets)
  - Recommended NDC(s) with:
    - NDC code
    - Number of packages needed
    - Total units provided
    - Overfill amount (if any)
  - Warning badges (if applicable)
- Information is clearly formatted and easy to read

**Verify**:
- All key information is visible without scrolling
- Warning badges are prominent
- NDC codes are copyable/selectable
- Package details are clear

---

## P1: Enhanced Features Tests

### Test 14: User Notification - Inactive NDC

**Requirement**: User notifications for inactive NDCs

**Steps**:
1. Enter an inactive NDC
2. Complete calculation
3. Observe notification

**Expected**:
- Clear notification message: "Warning: This NDC is inactive and may not be available"
- Notification is prominent (not just a badge)
- Suggests checking for alternative active NDCs

**Verify**:
- Notification is user-friendly
- Actionable guidance is provided

---

### Test 15: User Notification - Mismatched Quantities

**Requirement**: User notifications for mismatched quantities

**Steps**:
1. Enter drug with large overfill (>10%)
2. Complete calculation
3. Observe notification

**Expected**:
- Notification: "Warning: Selected package provides X% more than required"
- For underfill: "Warning: Selected package provides X% less than required"
- Suggests checking if alternative packages are available

**Verify**:
- Thresholds are correct (>10% overfill, <5% underfill)
- Notifications are clear and actionable

---

## Error Handling Tests

### Test 16: Drug Not Found - RxNorm Failure

**Requirement**: Drug not found: Return error with suggestion to check spelling or use NDC directly

**Steps**:
1. Enter drug: `nonexistentdrugxyz123`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- Error message: "We couldn't find that drug. Please check the spelling or try entering the NDC directly."
- Error is user-friendly and actionable
- Suggests checking spelling or using NDC
- No stack trace or technical error shown to user

**Verify**:
- Error handling catches RxNorm "not found" case
- Message is clear and helpful
- UI shows error state gracefully

---

### Test 17: Drug Not Found - FDA Fallback

**Requirement**: Retrieve valid NDCs using FDA NDC Directory API

**Steps**:
1. Enter drug: `aspirin` (drug that RxNorm may not have NDCs for)
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- RxNorm search may return no NDCs
- System falls back to FDA API search by drug name
- FDA API search succeeds and returns packages
- Calculation completes with FDA-sourced NDCs

**Verify**:
- Fallback logic works when RxNorm has no NDCs
- FDA search by drug name succeeds
- Package information is extracted correctly

---

### Test 18: NDC Not Found - Invalid NDC

**Requirement**: Error handling for invalid NDC

**Steps**:
1. Enter NDC: `12345-678-90` (invalid/fake NDC)
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- Error message: "No package information found for this NDC. Please verify the NDC."
- Error is user-friendly
- Suggests verifying the NDC code
- No technical error details exposed

**Verify**:
- FDA API returns empty results for invalid NDC
- Error is caught and displayed gracefully
- Message is actionable

---

### Test 19: API Timeout Handling

**Requirement**: API timeout: 10 seconds per external API call with retry logic (max 2 retries)

**Steps**:
1. Simulate slow network (throttle in browser DevTools)
2. Enter drug: `metformin`
3. Enter SIG: `1 tablet daily`
4. Enter days supply: `30`
5. Click "Calculate"

**Expected**:
- Request times out after 10 seconds
- System retries (up to 2 retries)
- If all retries fail, shows error: "The service is temporarily unavailable. Please try again."
- Error is user-friendly

**Verify**:
- Timeout is set to 10 seconds
- Retry logic works (max 2 retries)
- Error message is clear

---

### Test 20: Invalid SIG - Unparseable Pattern

**Requirement**: Invalid SIG: Prompt user for clarification or manual input

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `Take as needed for pain` (ambiguous frequency)
3. Enter days supply: `30`
4. Click "Calculate"

**Expected**:
- Error: "We couldn't understand the prescription instructions"
- Actionable: "Please enter the number of doses per day manually"
- Manual override field is visible
- User can proceed with manual input

**Verify**:
- SIG parser fails gracefully
- Error message is helpful
- Manual override is available

---

## Edge Cases

### Test 21: Very Large Days Supply

**Requirement**: Compute total quantity for varying days' supply

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `365` (1 year)
4. Click "Calculate"

**Expected**:
- Total quantity: 365 tablets
- System finds appropriate package sizes
- May recommend multiple packages (e.g., 3 × 120-tablet bottles + 1 × 30-tablet bottle)
- Calculation completes successfully

**Verify**:
- Large quantities are handled correctly
- Multi-pack logic works for large supplies
- No integer overflow or calculation errors

---

### Test 22: Very Small Days Supply

**Requirement**: Compute total quantity for varying days' supply

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Enter days supply: `3` (very short supply)
4. Click "Calculate"

**Expected**:
- Total quantity: 3 tablets
- System finds smallest available package (likely 30-tablet bottle)
- Shows significant overfill warning (>10%)
- Still provides recommendation

**Verify**:
- Small quantities are handled
- Overfill warning appears when appropriate
- Recommendation is still provided

---

### Test 23: Zero Days Supply (Reverse Calculation)

**Requirement**: Support reverse calculation (quantity → days supply)

**Steps**:
1. Enter drug: `metformin`
2. Enter SIG: `1 tablet daily`
3. Leave days supply empty (or enter 0)
4. Enter quantity: `30`
5. Click "Calculate" (if reverse calculation is supported)

**Expected**:
- System calculates days supply from quantity and SIG
- Days supply = 30 tablets / 1 tablet per day = 30 days
- Returns days supply calculation
- Shows recommended NDC(s) for that quantity

**Verify**:
- Reverse calculation works correctly
- Formula: days supply = quantity / (doses per day × units per dose)
- Results are accurate

---

### Test 24: NDC Format Variations

**Requirement**: Input drug name or NDC (handle various formats)

**Test Cases**:

#### 24a. NDC with dashes: `53943-080`
- Should be recognized as NDC
- Should query FDA API correctly

#### 24b. NDC without dashes: `53943080`
- Should be normalized and recognized as NDC
- Should add dashes for FDA API query if needed

#### 24c. 8-digit product NDC: `53943-080`
- Should use `product_ndc` field in FDA API

#### 24d. 11-digit package NDC: `06076067360`
- Should use `package_ndc` field in FDA API

**Verify**:
- All formats are correctly identified as NDCs
- Normalization works correctly
- FDA API queries use correct field and format

---

### Test 25: Package Size Extraction - Complex Descriptions

**Requirement**: Retrieve package sizes using FDA NDC Directory API

**Test Cases**:

#### 25a. Simple: "100 TABLET in 1 BOTTLE"
- Should extract: 100 tablets

#### 25b. Nested: "30 POUCH in 1 BOX / 1 TABLET in 1 POUCH"
- Should extract: 30 tablets (30 pouches × 1 tablet)

#### 25c. Nested: "6 BLISTER PACK in 1 BOX / 5 TABLET in 1 BLISTER PACK"
- Should extract: 30 tablets (6 blisters × 5 tablets)

#### 25d. Container only: "5 BOX in 1 CARTON" (no tablet count)
- Should log warning and return safe default (1)
- Should not "fudge" numbers

**Verify**:
- Package size extraction is accurate
- Nested descriptions are calculated correctly
- No numbers are "fudged" - uses actual API data
- Warnings are logged for unparseable descriptions

---

## Performance Tests

### Test 26: Response Time

**Requirement**: Handle normalization and computation in under 2 seconds per query

**Steps**:
1. Open browser DevTools → Network tab
2. Enter drug: `metformin`
3. Enter SIG: `1 tablet daily`
4. Enter days supply: `30`
5. Click "Calculate"
6. Measure time from click to results display

**Expected**:
- Total response time < 2 seconds
- Includes RxNorm API call, FDA API call(s), and calculation
- Loading indicator shows during processing

**Verify**:
- Response time meets requirement (<2s)
- Loading states are visible
- No unnecessary API calls

---

### Test 27: Caching Behavior

**Requirement**: Implement 24-hour cache for RxNorm lookups

**Steps**:
1. Enter drug: `metformin`
2. Complete calculation
3. Immediately enter same drug again
4. Complete calculation

**Expected**:
- Second request uses cached RxNorm result
- No RxNorm API call in network tab for second request
- Response time is faster for cached requests

**Verify**:
- Cache is working (check network tab)
- Cached responses are faster
- Cache persists for 24 hours (test after delay if possible)

---

## UI/UX Tests

### Test 28: Input Validation

**Requirement**: Input validation and sanitization

**Steps**:
1. Try submitting form with empty drug name
2. Try submitting with empty SIG
3. Try submitting with invalid days supply (negative, non-numeric)

**Expected**:
- Form validation prevents submission
- Error messages are clear: "Drug name or NDC is required", etc.
- Invalid inputs are highlighted

**Verify**:
- Client-side validation works
- Error messages are helpful
- Form doesn't submit invalid data

---

### Test 29: Loading States

**Requirement**: Implement loading states and error messages

**Steps**:
1. Enter valid prescription
2. Click "Calculate"
3. Observe loading state

**Expected**:
- Loading spinner/indicator appears immediately
- Button is disabled during calculation
- Loading state persists until results or error appear
- No duplicate submissions possible

**Verify**:
- Loading indicator is visible
- Form is disabled during processing
- No race conditions

---

### Test 30: Error Message Display

**Requirement**: Error messages are actionable and specific

**Steps**:
1. Trigger various error conditions (drug not found, NDC not found, SIG parsing failed)
2. Observe error messages

**Expected**:
- Each error has specific, actionable message
- Messages suggest next steps
- Errors are visually distinct (e.g., red text/badge)
- No technical stack traces shown to user

**Verify**:
- All error types have user-friendly messages
- Messages are actionable
- UI handles errors gracefully

---

## Regression Tests

### Test 31: Previously Fixed Bugs

**Regression checks for known fixes**:

#### 31a. Aspirin NDC Lookup
- Enter: `aspirin`, `1 tablet daily`, `30 days`
- **Expected**: Should find NDCs and return package information (not "No package information found")

#### 31b. Direct NDC Input (Product NDC)
- Enter: `53943-080`, `2 tablets daily`, `30 days`
- **Expected**: Should recognize as NDC and query FDA API correctly

#### 31c. Reverse Calculation (daysSupply = 0)
- Enter: `metformin`, `1 tablet daily`, leave days supply empty
- **Expected**: Should not error on validation, should treat as null

#### 31d. SIG Parsing - Numeric Frequencies
- Enter: `metformin`, `1 tablet 3 times daily`, `30 days`
- **Expected**: Should parse "3 times daily" correctly (not fail)

#### 31e. Metformin Drug Search
- Enter: `metformin`, `1 tablet daily`, `30 days`
- **Expected**: Should find drug via RxNorm (not "drug not found" error)

**Verify**:
- All previously fixed bugs remain fixed
- No regressions in core functionality

---

## Test Execution Notes

- **Environment**: Test in both development and production-like environments
- **Data**: Use real drug names and NDCs for accurate testing
- **APIs**: Verify actual API responses match expectations
- **Browser**: Test in Chrome, Firefox, Safari, Edge
- **Devices**: Test on desktop and tablet (responsive design)

## Test Results Documentation

Record results in `TESTING-RESULTS.md` with:
- Test number and name
- Pass/Fail status
- Screenshots for visual verification
- Notes on any issues found
- Date and tester name
