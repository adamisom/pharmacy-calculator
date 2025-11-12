# Product Requirements Document (PRD)

## 1. Executive Summary

The **NDC Packaging & Quantity Calculator** is an AI-accelerated tool designed to enhance the accuracy of prescription fulfillment in pharmacy systems by matching prescriptions with valid National Drug Codes (NDCs) and calculating correct dispense quantities. This tool addresses the common issues of dosage form mismatches, package size errors, and inactive NDCs that lead to claim rejections and patient dissatisfaction. By leveraging deterministic algorithms and integrating with key APIs, this solution will streamline pharmacy operations, improve medication normalization accuracy, and enhance patient experience.

## 2. Problem Statement

Pharmacy systems frequently encounter challenges in accurately matching prescriptions to valid NDCs and determining correct dispense quantities. Discrepancies in dosage forms, package sizes, and inactive NDCs often result in claim rejections, operational delays, and patient frustration. This project aims to overcome these challenges by developing a solution that ensures precise drug fulfillment across varying manufacturer NDCs and package sizes.

## 3. Goals & Success Metrics

**Goals:**

- Improve accuracy of medication normalization.
- Reduce claim rejections due to NDC mismatches.
- Enhance user satisfaction through efficient prescription processing.

**Success Metrics:**

- Achieve a medication normalization accuracy rate of 95% or higher.
- Decrease claim rejections related to NDC errors by 50%.
- Attain user satisfaction ratings of 4.5/5 or higher in pilot testing.

## 4. Target Users & Personas

**Primary Users:**

- **Pharmacists**: Require accurate NDC matching and quantity calculation to fulfill prescriptions efficiently without errors.
- **Pharmacy Technicians**: Need streamlined tools to assist in prescription processing and reduce manual errors.

**Secondary Users:**

- **Healthcare Administrators**: Interested in reducing operational inefficiencies and improving patient satisfaction.

**Pain Points:**

- Inaccurate NDC matching leading to fulfillment errors.
- Time-consuming manual processes.
- High error rates in prescription processing.

## 5. User Stories

1. **As a Pharmacist**, I want to input a drug name or NDC and receive the correct dispense quantity so that I can accurately fulfill prescriptions.
2. **As a Pharmacy Technician**, I want the system to highlight inactive NDCs so that I can avoid using them in prescriptions.
3. **As a Healthcare Administrator**, I want to monitor the accuracy of prescription fulfillment to ensure high operational efficiency.

## 6. Functional Requirements

**P0: Must-have**

- Input drug name or NDC, SIG, and days' supply.
- Normalize input to RxCUI using the RxNorm API.
- Retrieve valid NDCs and package sizes using the FDA NDC Directory API.
- Compute total quantity to dispense, respecting units.
- Select optimal NDC(s) that best match quantity and days' supply.
- Highlight overfills/underfills and inactive NDCs.
- Provide structured JSON output and a simple UI summary.

**P1: Should-have**

- User notifications for inactive NDCs or mismatched quantities.
- Support for multi-pack handling and special dosage forms like liquids, insulin, and inhalers.

**P2: Nice-to-have**

- Integration with pharmacy management systems for automated processing.

## 7. Non-Functional Requirements

- **Performance**: Handle normalization and computation in under 2 seconds per query.
- **Scalability**: Support concurrent usage by multiple users without degradation in performance.
- **Security**: Ensure secure data handling and API communications.
- **Compliance**: Adhere to relevant healthcare regulations and data protection standards.

## 8. User Experience & Design Considerations

- Simple and intuitive UI with clear navigation.
- Accessible design to accommodate diverse user needs.
- Key workflows to include input entry, result summary, and error notification.
- Responsive design for both desktop and tablet platforms.

## 9. Technical Requirements

- **Programming Language**: TypeScript
- **Framework**: SvelteKit
- **AI Frameworks**: OpenAI API for AI functionalities (optional enhancement)
- **Cloud Platform**: Google Cloud Platform (GCP)
- **APIs**:
  - RxNorm API for drug normalization
  - FDA NDC Directory API for NDC retrieval
- **Data Formats**: JSON for output and API communication

## 10. Dependencies & Assumptions

- Availability and reliability of RxNorm API and FDA NDC Directory API.
- Access to GCP resources for deployment and hosting.
- Assumes pharmacists and technicians have basic technical proficiency.

## 11. Out of Scope

- Integration with non-pharmacy medical systems.
- Real-time prescription processing beyond NDC calculations.
- Advanced analytics on prescription data.

---

## 12. Technical Architecture & Key Decisions

### 12.1 Architecture Overview

```
User Input → SvelteKit Frontend → Backend API Layer → External APIs
                                          ↓
                                   Calculation Engine
                                          ↓
                                   JSON Response → UI Display
```

### 12.2 Technical Decisions

**API Integration Strategy:**

- **RxNorm API**: Primary normalization source. Use the `/approximateTerm` endpoint for fuzzy matching of drug names, then `/rxcui/{rxcui}/ndcs` to get NDCs.
- **FDA NDC Directory API**: Use as secondary validation source and to retrieve package information and NDC status (active/inactive).
- **Caching Strategy**: Implement 24-hour cache for RxNorm lookups to reduce API load and improve response times.

**SIG Parsing:**

- Use deterministic regex-based parsing for common SIG patterns (e.g., "1 tablet twice daily", "2 puffs every 4-6 hours as needed").
- For complex or ambiguous SIG instructions, provide manual override option.
- **Decision**: Do NOT use OpenAI API for SIG parsing initially—keep it deterministic for reliability and cost control.

**Quantity Calculation Logic:**

- Formula: `Total Quantity = (Doses per Day × Days Supply) / Units per Package`
- Round up to nearest whole package when partial packages required.
- Flag overfills >10% and underfills <5%.

**OpenAI API Usage (P2 - Nice-to-have):**

- Initially NOT required for core functionality.
- Can be added later for: complex SIG parsing, natural language queries, or prescription validation suggestions.
- Keep as optional enhancement to maintain deterministic core behavior.

**Data Models:**

```typescript
interface PrescriptionInput {
	drugNameOrNDC: string;
	sig: string;
	daysSupply: number;
}

interface NDCPackage {
	ndc: string;
	packageSize: number;
	packageType: string; // bottle, box, inhaler, etc.
	isActive: boolean;
	manufacturer: string;
}

interface CalculationResult {
	rxcui: string;
	drugName: string;
	recommendedNDCs: NDCRecommendation[];
	totalQuantityNeeded: number;
	warnings: string[];
}

interface NDCRecommendation {
	ndc: string;
	packagesNeeded: number;
	totalUnits: number;
	overfill: number;
	packageDetails: NDCPackage;
}
```

**Error Handling:**

- API timeout: 10 seconds per external API call with retry logic (max 2 retries).
- Drug not found: Return error with suggestion to check spelling or use NDC directly.
- No active NDCs: Return inactive NDCs with clear warning.
- Invalid SIG: Prompt user for clarification or manual input.

---

## 13. Implementation Phases

### Phase 1: Core API Integration & Calculation Engine

**Effort: Medium** (Backend-heavy work with external API integration)

**Objectives:**

- Set up SvelteKit project structure
- Implement RxNorm API integration
- Implement FDA NDC Directory API integration
- Build core calculation engine

**Tasks:**

- [ ] Initialize SvelteKit project with TypeScript
- [ ] Set up GCP project and basic infrastructure
- [ ] Create API client modules for RxNorm and FDA NDC Directory
- [ ] Implement caching layer (in-memory or Redis for production)
- [ ] Build SIG parser with regex patterns for common formats
- [ ] Implement quantity calculation algorithm
- [ ] Create data models and TypeScript interfaces
- [ ] Add comprehensive error handling and logging

**Completion Criteria:**

- [ ] Can query RxNorm API and retrieve RxCUI from drug name
- [ ] Can retrieve NDCs from both RxNorm and FDA APIs
- [ ] Calculation engine correctly computes quantities for test cases
- [ ] API responses return proper JSON structure
- [ ] Error handling covers all external API failure modes

**Tests:**

- Unit tests for SIG parsing (20+ common patterns)
- Unit tests for quantity calculation with various scenarios
- Integration tests for each external API
- End-to-end test with sample prescriptions

**Key Risks:**

- RxNorm API rate limits or downtime → Implement caching and graceful degradation
- Inconsistent data between RxNorm and FDA APIs → Cross-validate and log discrepancies

---

### Phase 2: Frontend UI & User Interaction

**Effort: Low** (Simple form-based UI)

**Objectives:**

- Create intuitive input form
- Display calculation results clearly
- Show warnings and errors prominently

**Tasks:**

- [ ] Design form layout for drug input, SIG, and days' supply
- [ ] Implement input validation and sanitization
- [ ] Create results display component with NDC recommendations
- [ ] Add visual indicators for warnings (inactive NDCs, overfill/underfill)
- [ ] Implement loading states and error messages
- [ ] Add responsive design for desktop and tablet
- [ ] Create JSON output view for power users

**Completion Criteria:**

- [ ] Users can input prescription details via clean form
- [ ] Results display recommended NDCs with clear quantities
- [ ] Warnings are visually distinct and easy to understand
- [ ] UI is responsive on desktop and tablet devices
- [ ] Loading states prevent duplicate submissions

**Tests:**

- UI component tests for all input scenarios
- Accessibility testing (WCAG 2.1 AA compliance)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Responsive design testing on various screen sizes

**Key Risks:**

- Poor UX leading to user errors → Conduct user testing with pharmacists
- Accessibility issues → Use semantic HTML and ARIA labels

---

### Phase 3: NDC Selection Algorithm & Special Cases

**Effort: Medium** (Complex business logic)

**Objectives:**

- Implement optimal NDC selection logic
- Handle multi-pack scenarios
- Support special dosage forms (liquids, insulin, inhalers)

**Tasks:**

- [ ] Build NDC ranking algorithm (minimize overfill, prefer common packages)
- [ ] Implement multi-pack combination logic
- [ ] Add special handling for liquid medications (ml calculations)
- [ ] Add special handling for insulin (units/ml conversions)
- [ ] Add special handling for inhalers (puff/actuation counts)
- [ ] Create unit conversion utilities
- [ ] Add business rules for package selection preferences

**Completion Criteria:**

- [ ] Algorithm selects most cost-effective NDC combination
- [ ] Multi-pack scenarios correctly combine packages
- [ ] Special dosage forms calculate correctly with proper units
- [ ] Overfill is minimized while meeting days' supply requirement

**Tests:**

- Algorithm tests with various package size combinations
- Edge case testing (very large quantities, unusual dosage forms)
- Unit conversion accuracy tests
- Performance testing with complex multi-pack scenarios

**Key Risks:**

- Incorrect unit conversions → Maintain comprehensive conversion table with validation
- Edge cases not handled → Create extensive test suite covering pharmacy scenarios

---

### Phase 4: Validation, Notifications & Error States

**Effort: Low** (Enhancement layer)

**Objectives:**

- Add P1 notification features
- Improve error messaging
- Validate prescription logic

**Tasks:**

- [ ] Implement inactive NDC detection and highlighting
- [ ] Add overfill/underfill threshold notifications
- [ ] Create user-friendly error messages for all failure modes
- [ ] Add confirmation prompts for unusual quantities
- [ ] Implement logging for audit trail
- [ ] Add tooltip explanations for warnings

**Completion Criteria:**

- [ ] All inactive NDCs are flagged with clear warnings
- [ ] Users receive notifications when overfill >10% or underfill <5%
- [ ] Error messages are actionable and specific
- [ ] Audit logs capture all calculations for review

**Tests:**

- Test all notification triggers
- Verify error message clarity with user testing
- Validate audit log completeness

**Key Risks:**

- Alert fatigue from too many warnings → Calibrate thresholds based on user feedback
- Unclear error messages → Have pharmacists review all messaging

---

### Phase 5: Deployment & Monitoring

**Effort: Low** (Infrastructure setup)

**Objectives:**

- Deploy to GCP
- Set up monitoring and alerting
- Prepare for production traffic

**Tasks:**

- [ ] Configure GCP Cloud Run or App Engine for SvelteKit app
- [ ] Set up Cloud Logging and Monitoring
- [ ] Configure SSL certificates and custom domain
- [ ] Implement health check endpoints
- [ ] Set up API rate limiting and throttling
- [ ] Create deployment pipeline (CI/CD)
- [ ] Configure backup and disaster recovery
- [ ] Perform load testing

**Completion Criteria:**

- [ ] Application is accessible via secure HTTPS endpoint
- [ ] Monitoring dashboards track key metrics (latency, errors, API usage)
- [ ] Alerts configured for critical failures
- [ ] Application handles expected concurrent load (<2s response time)

**Tests:**

- Load testing with 50+ concurrent users
- Disaster recovery drill
- Security scanning (OWASP Top 10)

**Key Risks:**

- GCP service outages → Implement health checks and auto-restart
- Cost overruns from API usage → Monitor API call volume and implement quotas

---

## 14. Risk Assessment & Mitigation

| Risk                               | Impact | Probability | Mitigation Strategy                                            |
| ---------------------------------- | ------ | ----------- | -------------------------------------------------------------- |
| RxNorm API downtime                | High   | Medium      | Implement 24-hour cache, fallback to direct NDC input          |
| FDA API rate limits                | Medium | Medium      | Cache responses, implement request throttling                  |
| Incorrect quantity calculations    | High   | Low         | Extensive unit testing, pharmacist validation                  |
| SIG parsing failures               | Medium | Medium      | Provide manual override, log unparsed patterns for improvement |
| Inactive NDC not detected          | High   | Low         | Cross-validate with FDA API, always check status field         |
| Poor user adoption                 | Medium | Medium      | User testing with pharmacists, iterative UI improvements       |
| Security vulnerabilities           | High   | Low         | Regular security audits, input sanitization, HTTPS only        |
| Performance degradation under load | Medium | Low         | Load testing, implement caching, optimize database queries     |
| Data inconsistency between APIs    | Medium | Medium      | Log discrepancies, implement reconciliation logic              |
| Unit conversion errors             | High   | Low         | Maintain vetted conversion table, extensive testing            |

---

## 15. Testing Strategy

### 15.1 Unit Testing

- All calculation functions with edge cases
- SIG parsing with 50+ common patterns
- Unit conversion utilities
- API client modules (mocked responses)

### 15.2 Integration Testing

- Full workflow from input to output
- External API integration (RxNorm, FDA)
- Cache behavior and invalidation
- Error handling across components

### 15.3 End-to-End Testing

- Complete prescription processing workflows
- Multi-pack scenarios
- Special dosage forms
- Error states and recovery

### 15.4 User Acceptance Testing

- Pilot with 5-10 pharmacists
- Real prescription scenarios
- Usability feedback sessions
- Success metric validation

### 15.5 Performance Testing

- Load testing with 50+ concurrent users
- API response time validation (<2s)
- Cache hit rate optimization
- Memory and CPU profiling

---

## 16. Deployment Strategy

**Environment Progression:**

1. **Development**: Local testing and development
2. **Staging**: GCP staging environment with test data
3. **Production**: GCP production environment

**Deployment Approach:**

- Blue-green deployment for zero-downtime updates
- Feature flags for gradual rollout of P1/P2 features
- Automated CI/CD pipeline via GitHub Actions or Cloud Build

**Rollback Plan:**

- Keep previous version deployed for quick rollback
- Database migrations must be backward-compatible
- Monitor error rates for 24 hours post-deployment

---

## 17. Open Questions & Decisions Needed

1. **Cache Duration**: 24-hour cache for RxNorm lookups sufficient? Consider pharmacy inventory turnover rates.
2. **Multi-pack Logic**: Should system prefer single large package or multiple smaller packages? (Recommendation: Minimize overfill first, then minimize package count)
3. **OpenAI Integration**: Defer to Phase 6+ as optional enhancement, or integrate in Phase 1? (Recommendation: Defer—keep core deterministic)
4. **User Authentication**: Required for initial launch, or can be open tool? (Recommendation: Add basic auth for production to track usage)
5. **Audit Logging**: Store full prescription details or just summary? (Recommendation: Summary only to avoid PHI concerns)

---

## 18. Success Criteria & Launch Readiness

**Launch Checklist:**

- [ ] All P0 requirements implemented and tested
- [ ] User acceptance testing complete with >80% satisfaction
- [ ] Security audit passed with no critical vulnerabilities
- [ ] Performance testing demonstrates <2s response time
- [ ] Monitoring and alerting configured
- [ ] Documentation complete (user guide, API docs)
- [ ] Rollback plan tested
- [ ] Support process defined for user issues

**Post-Launch Monitoring (First 30 Days):**

- Medication normalization accuracy rate
- Claim rejection rate changes
- User satisfaction scores
- API error rates and downtime
- Performance metrics (latency, throughput)
- User feedback and feature requests

---

## 19. Future Enhancements (Post-MVP)

**Phase 6+: Advanced Features**

- Integration with pharmacy management systems (P2)
- Batch processing for multiple prescriptions
- Historical data analytics and reporting
- OpenAI integration for complex SIG parsing
- Mobile app version
- Drug interaction checking
- Cost optimization recommendations
- Insurance formulary integration

---

This implementation PRD provides a comprehensive roadmap for building the NDC Packaging & Quantity Calculator with clear phases, technical decisions, and risk mitigation strategies. The focus is on delivering core functionality quickly while maintaining quality and allowing for future enhancements.
