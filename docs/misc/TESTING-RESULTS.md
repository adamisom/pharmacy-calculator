# Quick Smoke Test

## Test 1: Basic Forward Calculation

**Input:**

- Drug: `aspirin`
- SIG: `1 tablet twice daily`
- Days: `30`

**Expected:** Total quantity 60 tablets, NDC recommendations displayed, no errors

**Result:** ✅ PASSED

![Test 1 Result - Aspirin Calculation](./test-results/test-1-aspirin-result.png)

---

## Test 2: Direct NDC Input

**Input:**

- Drug/NDC: `53943-080` (product NDC format - verified to work with FDA API)
- SIG: `2 tablets daily`
- Days: `30`

**Expected:** Bypasses RxNorm, shows NDC results for the specified NDC

**Result:** ✅ PASSED

![Test 2 Result - Direct NDC Input](./test-results/test-2-real-NDC-result.png)

**Note:** The FDA API requires product_ndc format (8-9 digits with dashes) for direct lookup. Package-level NDCs (11 digits) must be looked up via their parent product_ndc. The result shows 100% overfill warning (60 units needed, 120 unit package available).

---

## Test 3: Reverse Calculation

**Input:**

- Drug: `ibuprofen`
- SIG: `1 tablet 3 times daily`
- Days: (leave empty)
- Quantity: `90`

**Expected:** Calculated days supply: 30 days

**Result:** ✅ PASSED

![Test 3 Result - Reverse Calculation](./test-results/test-3-SIG-result.png)

---

## Test 4: Error Handling - Invalid Drug

**Input:**

- Drug: `xyzabc123nonexistent`
- SIG: `1 tablet daily`
- Days: `30`

**Expected:** User-friendly error message

**Result:** ✅ PASSED

![Test 4 Result - Invalid Drug Error](./test-results/test-4-invalid-drug.png)

---

## Test 5: Error Handling - Invalid Input

**Input:**

- Empty drug name
- Empty SIG
- Days: `0`

**Expected:** Validation errors displayed, form prevents submission

**Result:** ✅ PASSED

![Test 5 Result - Form Validation Errors](./test-results/test-5-form-error.png)

---

## Test 6: Overfill Warning Display

**Input:** Any valid calculation that results in >10% overfill

**Guidance for constructing test inputs:**

- Use a small quantity needed with a drug that has large package sizes. Examples:
  - Drug: `aspirin`, SIG: `1 tablet daily`, Days: `7` (needs 7 tablets) - works well
  - Drug: `metformin`, SIG: `1 tablet daily`, Days: `5` (needs 5 tablets) - metformin often has large packages (100, 180, 500+ tablets)

**Expected:** Warning badge displayed (yellow for overfill) on affected NDC recommendations

---

## Test 7: Inactive NDC Warning Display

**Input:** Any valid calculation that results in inactive NDCs

**Guidance for constructing test inputs:**

- An inactive NDC is a medication package that has passed its marketing end date in the FDA database. This means the manufacturer has discontinued marketing that specific package size/format. The system automatically shows warnings (red badge) for any recommended NDCs that are marked as inactive.

  **To find inactive NDCs for testing:**
  1. Search for older or less common drugs (e.g., `phentermine`, `warfarin`, `digoxin`)
  2. Look for drugs that may have been reformulated or discontinued
  3. Check the FDA API results - packages with `marketing_end_date` in the past will be marked inactive
  4. If no inactive NDCs appear in results, the system will still show the warning badge if any are found
  5. You can also try searching for specific NDCs that you know are discontinued

**Expected:** Warning badge displayed (red for inactive) on affected NDC recommendations

---

## Test 8: JSON Output

**Input:** Any valid calculation

**Expected:** "Show JSON" button toggles formatted JSON output

**Result:** ✅ PASSED

![Test 8 Result - JSON Output](./test-results/test-7-JSON-output.png)

---

## Longer Testing

See [TESTING.md](./TESTING.md) for comprehensive manual testing scenarios covering all PRD requirements.
