# API Documentation

## Endpoint

**POST** `/api/calculate`

Calculate NDC recommendations for a prescription.

## Request

### Headers

```
Content-Type: application/json
```

### Body

```typescript
{
  drugNameOrNDC: string;        // Drug name or NDC code
  sig: string;                   // Prescription instructions (SIG)
  daysSupply: number | null;     // Days supply (null if using reverse calculation)
  totalQuantity?: number;         // Total quantity (for reverse calculation)
  manualDosesPerDay?: number;    // Manual override for doses per day
}
```

### Example Request

```json
{
  "drugNameOrNDC": "Aspirin",
  "sig": "1 tablet twice daily",
  "daysSupply": 30
}
```

### Reverse Calculation Example

```json
{
  "drugNameOrNDC": "Metformin",
  "sig": "1 tablet twice daily",
  "daysSupply": null,
  "totalQuantity": 60
}
```

## Response

### Success (200 OK)

```typescript
{
  rxcui: string;                    // RxNorm concept unique identifier
  drugName: string;                  // Normalized drug name
  recommendedNDCs: NDCRecommendation[];
  totalQuantityNeeded: number;       // Calculated total quantity
  daysSupply: number;                // Calculated days supply
  warnings: string[];                // Array of warning messages
}
```

### NDCRecommendation

```typescript
{
  ndc: string;                       // NDC code
  packagesNeeded: number;            // Number of packages to dispense
  totalUnits: number;                // Total units in packages
  overfill: number;                  // Overfill percentage
  packageDetails: {
    ndc: string;
    packageSize: number;
    packageType: "bottle" | "box" | "inhaler" | "vial" | "syringe" | "tube" | "pack" | "carton";
    isActive: boolean;
    manufacturer: string;
  }
}
```

### Example Response

```json
{
  "rxcui": "1191",
  "drugName": "Aspirin",
  "recommendedNDCs": [
    {
      "ndc": "12345-678-90",
      "packagesNeeded": 1,
      "totalUnits": 90,
      "overfill": 0,
      "packageDetails": {
        "ndc": "12345-678-90",
        "packageSize": 90,
        "packageType": "bottle",
        "isActive": true,
        "manufacturer": "Example Pharma"
      }
    }
  ],
  "totalQuantityNeeded": 60,
  "daysSupply": 30,
  "warnings": []
}
```

## Error Responses

### Validation Error (400 Bad Request)

```json
{
  "error": "Validation failed: Days supply must be between 1 and 365",
  "actionable": "Please enter a valid days supply between 1 and 365 days."
}
```

### Drug Not Found (400 Bad Request)

```json
{
  "error": "Drug not found. Please check the drug name or NDC code.",
  "actionable": "Try using an alternative drug name or enter an NDC code directly."
}
```

### No Active NDCs (400 Bad Request)

```json
{
  "error": "No active NDCs found for this drug.",
  "actionable": "All available NDCs for this drug are inactive. Contact the manufacturer or use an alternative drug."
}
```

### Server Error (500 Internal Server Error)

```json
{
  "error": "An unexpected error occurred. Please try again."
}
```

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Client error (validation, drug not found, etc.) |
| 500 | Server error |

## Integration Examples

### cURL

```bash
curl -X POST https://your-domain.com/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "drugNameOrNDC": "Aspirin",
    "sig": "1 tablet twice daily",
    "daysSupply": 30
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('/api/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    drugNameOrNDC: 'Aspirin',
    sig: '1 tablet twice daily',
    daysSupply: 30
  })
});

const result = await response.json();
```

### Python

```python
import requests

response = requests.post(
    'https://your-domain.com/api/calculate',
    json={
        'drugNameOrNDC': 'Aspirin',
        'sig': '1 tablet twice daily',
        'daysSupply': 30
    }
)

result = response.json()
```

## Rate Limits

- No rate limits enforced by the application
- External APIs (RxNorm, FDA) may have their own limits
- FDA API: 1,000 requests/day without key, 120,000/day with API key

## Caching

API responses are cached in-memory for 24 hours. Cache keys:
- `rxnorm:approximateTerm:{drugName}` → RxCUI lookup
- `rxnorm:ndcs:{rxcui}` → NDC list
- `fda:ndc:{normalizedNDC}` → FDA package info

Cache resets on application restart.

