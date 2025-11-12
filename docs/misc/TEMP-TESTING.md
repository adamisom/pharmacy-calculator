# Manual Testing Scenarios

## Test 1: Basic Forward Calculation
**Input:**
- Drug: `aspirin`
- SIG: `1 tablet twice daily`
- Days: `30`

**Expected:** Total quantity 60 tablets, NDC recommendations displayed, no errors

---

## Test 2: Direct NDC Input
**Input:**
- Drug/NDC: `12345-6789-01`
- SIG: `2 tablets daily`
- Days: `30`

**Expected:** Bypasses RxNorm, shows NDC results

---

## Test 3: Reverse Calculation
**Input:**
- Drug: `ibuprofen`
- SIG: `1 tablet 3 times daily`
- Days: (leave empty)
- Quantity: `90`

**Expected:** Calculated days supply: 30 days

---

## Test 4: Error Handling - Invalid Drug
**Input:**
- Drug: `xyzabc123nonexistent`
- SIG: `1 tablet daily`
- Days: `30`

**Expected:** User-friendly error message

---

## Test 5: Error Handling - Invalid Input
**Input:**
- Empty drug name
- Empty SIG
- Days: `0`

**Expected:** Validation errors displayed, form prevents submission

---

## Test 6: Warning Display
**Input:** Any valid calculation that results in inactive NDCs or >10% overfill

**Expected:** Warning badges displayed

---

## Test 7: JSON Output
**Input:** Any valid calculation

**Expected:** "Show JSON" button toggles formatted JSON output

