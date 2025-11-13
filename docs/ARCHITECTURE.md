# Architecture Document

## Overview

The NDC Packaging & Quantity Calculator is a SvelteKit application that helps pharmacists and pharmacy technicians accurately match prescriptions with valid National Drug Codes (NDCs) and calculate correct dispense quantities. The system integrates with external APIs (RxNorm and FDA NDC Directory) to provide real-time drug information and package data.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  (SvelteKit Frontend - Svelte Components)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP POST /api/calculate
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SvelteKit API Route                      │
│              (/api/calculate/+server.ts)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Calculation Service Layer                      │
│         (src/lib/services/calculation.ts)                   │
│  - Input Validation                                         │
│  - Orchestration                                            │
│  - Error Handling                                           │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  RxNorm API  │  │   FDA API    │  │ SIG Parser   │
│   Client     │  │   Client     │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Calculation Engine                        │
│  - Quantity Calculator                                       │
│  - NDC Selector Algorithm                                   │
│  - Reverse Calculator                                        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cache Layer                             │
│              (In-Memory, 24-hour TTL)                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer

**Location**: `src/routes/` and `src/lib/components/`

#### Main Page (`+page.svelte`)

- Entry point for the application
- Manages application state (loading, results, errors)
- Coordinates form submission and result display

#### Components

- **PrescriptionForm.svelte**: Input form with validation
- **ResultsDisplay.svelte**: Main results container
- **NDCRecommendation.svelte**: Individual NDC recommendation card
- **WarningBadge.svelte**: Visual warning indicators
- **LoadingSpinner.svelte**: Loading state indicator
- **ErrorMessage.svelte**: User-friendly error display
- **JSONOutput.svelte**: Collapsible JSON output for power users

### API Layer

**Location**: `src/routes/api/calculate/+server.ts`

- Handles HTTP POST requests
- Validates request format
- Calls calculation service
- Returns JSON responses with appropriate HTTP status codes
- Converts errors to user-friendly messages

### Service Layer

**Location**: `src/lib/services/`

#### Calculation Service (`calculation.ts`)

Main orchestration service that:

1. Validates input
2. Normalizes drug input (RxNorm or direct NDC)
3. Retrieves NDC package information (FDA)
4. Parses SIG instructions
5. Calculates quantities
6. Selects optimal NDCs
7. Generates warnings
8. Returns structured result

#### Validation Service (`validation.ts`)

- Input validation logic
- Business rule validation (days supply ranges, etc.)
- Returns structured validation results

### API Client Layer

**Location**: `src/lib/api/`

#### RxNorm Client (`rxnorm.ts`)

- `searchDrugName()`: Fuzzy search for drug names
- `getNDCsForRxCUI()`: Get NDCs for a given RxCUI
- `normalizeDrugInput()`: Auto-detect NDC vs drug name
- `normalizeNDC()`: Standardize NDC format
- `isNDCFormat()`: Detect if input is an NDC

**API Endpoints Used**:

- `GET /approximateTerm.json?term={drugName}&maxEntries=1`
- `GET /rxcui/{rxcui}/ndcs.json`

#### FDA Client (`fda.ts`)

- `getNDCPackageInfo()`: Get package details for a single NDC
- `getMultipleNDCInfo()`: Batch fetch package info
- `extractPackageSize()`: Parse package size from description
- `inferPackageType()`: Determine package type from description
- `isNDCActive()`: Check if NDC is active based on end date

**API Endpoints Used**:

- `GET /drug/ndc.json?search=product_ndc:"{ndc}"&limit=1`

#### Cache (`cache.ts`)

- In-memory cache with TTL support
- Key-based storage
- Automatic expiration
- Thread-safe operations (single-threaded JavaScript)

### Parser Layer

**Location**: `src/lib/parsers/`

#### SIG Parser (`sig.ts`)

- `parseSIG()`: Attempts to parse SIG string
- `parseSIGWithFallback()`: Parses with manual override support

#### SIG Patterns (`sig-patterns.ts`)

- Regex pattern definitions for common SIG formats
- Frequency calculation helpers
- Unit type detection
- Support for multiple dosage forms:
  - Tablets and capsules
  - Liquid medications (ml, teaspoons, tablespoons)
  - Insulin (units)
  - Inhalers (puffs, actuations)

### Calculator Layer

**Location**: `src/lib/calculators/`

#### Quantity Calculator (`quantity.ts`)

- `calculateTotalQuantityNeeded()`: Calculate total units needed (unit-agnostic - works for tablets, ml, units, puffs, etc.)
- `calculatePackagesNeeded()`: Calculate number of packages (rounds up)
- `calculateOverfill()`: Calculate overfill percentage
- `calculateUnderfill()`: Calculate underfill percentage

#### NDC Selector (`ndc-selector.ts`)

- `selectOptimalNDCs()`: Main selection algorithm
  - Filters active NDCs
  - Filters by underfill threshold
  - Sorts by overfill (ascending), then package count
  - Returns top 3 recommendations
- `findMultiPackCombination()`: Find optimal multi-pack combinations
- `createNDCRecommendation()`: Create recommendation object

#### Reverse Calculator (`reverse.ts`)

- `calculateDaysSupplyFromQuantity()`: Calculate days supply from quantity and SIG

### Utility Layer

**Location**: `src/lib/utils/` and `src/lib/`

#### Error Utilities (`utils/errors.ts`)

- `UserFriendlyError`: Custom error class
- Error factory functions for common scenarios
- User-facing error messages

#### Unit Conversion Utilities (`utils/unit-conversions.ts`)

- Volume conversions (teaspoons→ml, tablespoons→ml, fluid ounces→ml)
- Insulin unit conversions (units→ml for U-100, U-200, U-500)
- Volume parsing from strings
- Standard pharmacy conversion factors

#### Configuration (`config.ts`)

- API endpoints and base URLs
- Cache TTL settings
- Calculation thresholds
- Environment variable access

#### Type Definitions (`types.ts`)

- TypeScript interfaces for all data structures
- Type aliases for enums
- Unit types: `'tablet' | 'capsule' | 'ml' | 'unit' | 'puff' | 'actuation'`
- Package types: `'bottle' | 'box' | 'inhaler' | 'vial' | 'syringe' | 'tube' | 'pack' | 'carton'`

## Data Flow

### Request Flow

1. **User Input** → User fills out prescription form
2. **Form Validation** → Client-side validation
3. **API Request** → POST to `/api/calculate`
4. **Server Validation** → Server-side validation
5. **Drug Normalization** → RxNorm API or direct NDC lookup
6. **NDC Retrieval** → Get NDCs from RxNorm
7. **Package Info** → Fetch package details from FDA
8. **SIG Parsing** → Parse prescription instructions
9. **Quantity Calculation** → Calculate total quantity needed
10. **NDC Selection** → Select optimal NDCs
11. **Warning Generation** → Generate warnings for edge cases
12. **Response** → Return JSON result
13. **UI Update** → Display results to user

### Caching Strategy

**Cache Keys**:

- `rxnorm:approximateTerm:{drugName}` → RxCUI lookup result
- `rxnorm:ndcs:{rxcui}` → NDC list for RxCUI
- `fda:ndc:{normalizedNDC}` → FDA package information

**Cache TTL**: 24 hours (86400000 ms)

**Cache Invalidation**:

- Automatic expiration after TTL
- Manual clear on application restart
- No persistent storage (in-memory only)

## External Dependencies

### APIs

#### RxNorm API

- **Base URL**: `https://rxnav.nlm.nih.gov/REST`
- **Authentication**: None required
- **Rate Limits**: Not documented (low volume usage acceptable)
- **Endpoints**:
  - `/approximateTerm.json` - Drug name search
  - `/rxcui/{rxcui}/ndcs.json` - Get NDCs for RxCUI

#### FDA NDC Directory API

- **Base URL**: `https://api.fda.gov/drug/ndc.json`
- **Authentication**: Optional API key (for higher rate limits)
- **Rate Limits**:
  - Without key: 240 req/min, 1,000 req/day
  - With key: 240 req/min, 120,000 req/day
- **Endpoints**:
  - `?search=product_ndc:"{ndc}"&limit=1` - Get package info

### Technology Stack

- **Framework**: SvelteKit 2.x
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **Build Tool**: Vite 7.x
- **Testing**: Vitest
- **Deployment**: GCP (Cloud Run or App Engine)

## Error Handling Strategy

### Error Types

1. **User Input Errors**: Validation failures, missing required fields
2. **API Errors**: Timeouts, network failures, invalid responses
3. **Business Logic Errors**: No NDCs found, inactive NDCs only, parsing failures
4. **System Errors**: Unexpected exceptions

### Error Flow

```
Error Occurs
    ↓
Catch in appropriate layer
    ↓
Convert to UserFriendlyError (if needed)
    ↓
Log technical details (console)
    ↓
Return user-friendly message to UI
    ↓
Display with actionable guidance
```

### Error Messages

All error messages follow these principles:

- **User-friendly language**: No technical jargon
- **Actionable**: Suggest next steps
- **Contextual**: Relevant to the specific error
- **Professional**: Appropriate for healthcare setting

## Security Considerations

### Input Validation

- Server-side validation for all inputs
- Type checking with TypeScript
- Sanitization of user inputs
- Range validation (days supply, quantities)

### API Security

- No sensitive data in API requests
- HTTPS for all external API calls
- API keys stored in environment variables (optional)
- No authentication required for RxNorm (public API)

### Data Privacy

- No persistent storage of prescription data
- No logging of PHI (Protected Health Information)
- Cache only contains drug identifiers, not patient data
- All processing happens server-side

## Performance Considerations

### Caching

- Aggressive caching of API responses (24 hours)
- In-memory cache for fast access
- Cache keys designed to prevent collisions

### API Optimization

- Parallel API calls where possible (`Promise.all`)
- Retry logic with exponential backoff
- Timeout handling (10 seconds per request)
- Batch operations for multiple NDCs

### Frontend Optimization

- SvelteKit's built-in code splitting
- Lazy loading of components (if needed)
- Minimal re-renders with Svelte reactivity
- Efficient state management

## Scalability

### Current Design (Low Volume)

- In-memory cache sufficient
- No database required
- Stateless API design
- Single-instance deployment acceptable

### Future Scalability (If Needed)

- **Cache**: Move to Redis for multi-instance deployments
- **Database**: Add database for audit logging (if required)
- **Load Balancing**: GCP load balancer for multiple instances
- **CDN**: Static assets via CDN
- **Monitoring**: Add application performance monitoring

## Deployment Architecture

### Development

- Local development server (`npm run dev`)
- Hot module replacement
- Source maps enabled

### Production (GCP)

- **Option 1: Cloud Run**
  - Containerized deployment
  - Auto-scaling
  - Pay-per-use pricing
- **Option 2: App Engine**
  - Managed platform
  - Automatic scaling
  - Integrated with GCP services

### Environment Variables

- `VITE_FDA_API_KEY` (optional): FDA API key for higher rate limits

## Testing Strategy

### Unit Tests

- Calculator functions
- SIG parser patterns
- Utility functions
- Error handling

### Integration Tests

- API client modules (with mocked responses)
- Service layer orchestration
- End-to-end API route testing

### Integration Tests

- API route testing
- Service layer integration
- End-to-end calculation flows

### Manual Testing

- Real API integration
- Edge cases
- User acceptance testing with pharmacists

## Monitoring & Observability

### Logging

- Console logging for errors
- Structured logging for debugging
- No PHI in logs

### Metrics (Future)

- API response times
- Cache hit rates
- Error rates
- User activity (anonymized)

### Health Checks

- API endpoint health check (future)
- External API availability checks (future)

## Future Enhancements

### Phase 2+ Features (P2 - Out of Scope for MVP)

- OpenAI integration for complex SIG parsing
- Batch processing for multiple prescriptions
- Historical data analytics
- Integration with pharmacy management systems

**Note:** All P0 and P1 requirements from the PRD have been implemented, including special dosage form support (liquids, insulin, inhalers).

### Architecture Improvements

- Persistent cache (Redis)
- Database for audit logging
- Real-time monitoring dashboard
- Advanced error tracking (Sentry, etc.)

## Decision Log

### Key Architectural Decisions

1. **In-Memory Cache**: Chosen for simplicity and low-volume usage. Can be upgraded to Redis if needed.

2. **Deterministic SIG Parsing**: Regex-based parsing chosen over AI for reliability and cost control.

3. **SvelteKit API Routes**: Server-side API routes chosen over separate backend for simplicity and deployment ease.

4. **TypeScript**: Full TypeScript for type safety and better developer experience.

5. **Tailwind CSS**: Utility-first CSS for rapid UI development and consistency.

6. **No Database**: Stateless design with no persistent storage for MVP. Can be added later if needed.

7. **User-Friendly Errors**: All errors converted to user-friendly messages for healthcare professionals.

8. **Optional FDA API Key**: App works without API key for low-volume usage, key optional for higher limits.
