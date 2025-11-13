# Demo Script - NDC Calculator

## Overview
Demonstrate all PRD P0 and P1 features in a logical flow that showcases the system's capabilities.

---

## Demo Flow

### 1. Introduction (5 seconds)
- **Action:** Open application
- **Show:** Clean, simple UI
- **Narration:** "This is the NDC Calculator - a tool that helps pharmacists match prescriptions with valid NDCs and calculate correct dispense quantities."

---

### 2. Basic Forward Calculation - Tablets (30 seconds)
- **Action:** 
  - Enter: Drug = "aspirin"
  - Enter: SIG = "1 tablet twice daily"
  - Enter: Days Supply = "30"
  - Click Calculate
- **Show:** 
  - Loading state
  - Results with NDC recommendations
  - Package details (size, manufacturer, active status)
- **Narration:** "For a standard prescription, the system normalizes the drug name using RxNorm, retrieves NDC packages from the FDA, and calculates optimal package combinations."

---

### 3. Direct NDC Input (20 seconds)
- **Action:**
  - Enter: Drug/NDC = "53943-080"
  - Enter: SIG = "2 tablets daily"
  - Enter: Days Supply = "30"
  - Click Calculate
- **Show:**
  - Bypasses RxNorm lookup
  - Direct FDA lookup
  - Results for specific NDC
- **Narration:** "You can also enter an NDC directly, which bypasses drug name normalization and goes straight to package information."

---

### 4. Reverse Calculation (20 seconds)
- **Action:**
  - Enter: Drug = "ibuprofen"
  - Enter: SIG = "1 tablet 3 times daily"
  - Leave Days Supply empty
  - Enter: Total Quantity = "90"
  - Click Calculate
- **Show:**
  - Calculated days supply (30 days)
  - NDC recommendations based on reverse calculation
- **Narration:** "The system can also work backwards - given a total quantity, it calculates the days supply."

---

### 5. Special Dosage Forms - Liquid Medication (25 seconds)
- **Action:**
  - Enter: Drug = "amoxicillin" (or any liquid medication)
  - Enter: SIG = "5 ml twice daily"
  - Enter: Days Supply = "10"
  - Click Calculate
- **Show:**
  - SIG parsing recognizes "ml"
  - Results show ml-based calculations
  - Package sizes in ml
- **Narration:** "The system handles liquid medications, parsing ml-based instructions and matching them with appropriate bottle sizes."

---

### 6. Special Dosage Forms - Unit Conversion (20 seconds)
- **Action:**
  - Enter: Drug = "amoxicillin"
  - Enter: SIG = "1 teaspoon twice daily"
  - Enter: Days Supply = "10"
  - Click Calculate
- **Show:**
  - SIG parsing converts teaspoons to ml (1 tsp = 5 ml)
  - Results show converted ml values
- **Narration:** "It automatically converts common units - teaspoons and tablespoons are converted to milliliters for accurate calculations."

---

### 7. Special Dosage Forms - Insulin (25 seconds)
- **Action:**
  - Enter: Drug = "insulin glargine" (or "insulin")
  - Enter: SIG = "20 units at bedtime"
  - Enter: Days Supply = "30"
  - Click Calculate
- **Show:**
  - SIG parsing recognizes "units"
  - Results show unit-based calculations
  - Package sizes in units
- **Narration:** "For insulin, the system handles unit-based dosing, recognizing patterns like 'at bedtime' or 'before meals'."

---

### 8. Special Dosage Forms - Inhaler (25 seconds)
- **Action:**
  - Enter: Drug = "albuterol" (or any inhaler medication)
  - Enter: SIG = "2 puffs twice daily"
  - Enter: Days Supply = "30"
  - Click Calculate
- **Show:**
  - SIG parsing recognizes "puffs"
  - Results show puff-based calculations
  - Package sizes in puffs/actuations
- **Narration:** "Inhalers are handled with puff or actuation counts, matching the prescription to appropriate inhaler sizes."

---

### 9. Overfill Warning Display (20 seconds)
- **Action:**
  - Enter: Drug = "metformin"
  - Enter: SIG = "1 tablet daily"
  - Enter: Days Supply = "5"
  - Click Calculate
- **Show:**
  - Yellow warning badge for overfill >10%
  - Overfill percentage displayed
  - Multiple package options shown
- **Narration:** "The system flags when recommended packages exceed the needed quantity by more than 10%, helping you identify potential waste."

---

### 10. Multi-Pack Combination (20 seconds)
- **Action:**
  - Use a calculation that shows multi-pack recommendations
  - Point to results showing multiple NDCs combined
- **Show:**
  - Multiple NDCs listed together
  - Combined package count
  - Lower overfill than single-pack options
- **Narration:** "When a single package would result in high overfill, the system suggests combining multiple package sizes to minimize waste."

---

### 11. Inactive NDC Warning (if available) (15 seconds)
- **Action:**
  - If an inactive NDC appears in results, point it out
  - Otherwise, mention the feature
- **Show:**
  - Red "Inactive" warning badge
  - Warning message in results
- **Narration:** "The system flags inactive NDCs that are no longer marketed, helping you avoid dispensing discontinued packages."

---

### 12. Error Handling - Invalid Drug (15 seconds)
- **Action:**
  - Enter: Drug = "xyzabc123nonexistent"
  - Enter: SIG = "1 tablet daily"
  - Enter: Days Supply = "30"
  - Click Calculate
- **Show:**
  - User-friendly error message
  - Suggestion to check spelling or use NDC directly
- **Narration:** "If a drug isn't found, the system provides clear, actionable error messages with suggestions."

---

### 13. Form Validation (15 seconds)
- **Action:**
  - Try to submit with empty fields
  - Try to submit with both Days Supply and Total Quantity filled
- **Show:**
  - Validation errors displayed
  - Form prevents submission
- **Narration:** "The form validates inputs and prevents common errors, like providing both days supply and total quantity."

---

### 14. JSON Output (10 seconds)
- **Action:**
  - On any results page, click "Show JSON"
- **Show:**
  - Formatted JSON output
  - Complete calculation result structure
- **Narration:** "For power users or integration, the complete calculation result is available in structured JSON format."

---

### 15. localStorage Dropdowns (10 seconds)
- **Action:**
  - Type in drug name field
  - Show dropdown with previous entries
  - Show SIG dropdown with common templates
- **Show:**
  - Drug history dropdown
  - SIG template dropdown
  - Days supply and quantity dropdowns
- **Narration:** "The system remembers your frequently used drugs and provides quick-access templates for common prescription patterns."

---

### 16. Summary (10 seconds)
- **Action:** Return to main view
- **Narration:** "The NDC Calculator provides accurate, efficient prescription fulfillment with support for tablets, liquids, insulin, and inhalers, helping reduce errors and improve pharmacy operations."

---

## Total Demo Time: ~4-5 minutes

## Key Features to Highlight
1. ✅ Drug name normalization via RxNorm
2. ✅ Direct NDC input
3. ✅ Forward and reverse calculations
4. ✅ Special dosage forms (liquids, insulin, inhalers)
5. ✅ Unit conversions (teaspoons/tablespoons → ml)
6. ✅ Overfill/underfill warnings
7. ✅ Inactive NDC detection
8. ✅ Multi-pack combinations
9. ✅ Error handling
10. ✅ Form validation
11. ✅ JSON output
12. ✅ User-friendly UI with templates

