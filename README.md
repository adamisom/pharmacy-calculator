# NDC Packaging & Quantity Calculator

An AI-accelerated tool designed to enhance the accuracy of prescription fulfillment in pharmacy systems by matching prescriptions with valid National Drug Codes (NDCs) and calculating correct dispense quantities.

## Features

- **Drug Normalization**: Automatically match drug names to RxCUI using RxNorm API
- **NDC Lookup**: Retrieve valid NDCs and package information from FDA NDC Directory
- **Quantity Calculation**: Calculate total quantity needed based on SIG and days supply
- **NDC Selection**: Algorithm selects optimal NDC packages that minimize overfill
- **Reverse Calculation**: Calculate days supply from total quantity and SIG
- **SIG Parsing**: Parse common prescription instruction patterns
- **Warning System**: Flag inactive NDCs, overfills, and underfills
- **User-Friendly Errors**: Clear, actionable error messages for healthcare professionals

## Tech Stack

- **Framework**: SvelteKit 2.x
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **Build Tool**: Vite 7.x
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) FDA API key for higher rate limits - get one at [open.fda.gov](https://open.fda.gov/apis/authentication/)

### Installation

1. Clone the repository:

```sh
git clone <repository-url>
cd ndc-calculator
```

1. Install dependencies:

```sh
npm install
```

1. (Optional) Set up environment variables:

```sh
# Create .env file
echo "VITE_FDA_API_KEY=your_key_here" > .env
```

**Note**: The FDA API key is optional. The app works without it for low-volume usage. The key only increases rate limits (from 1,000 to 120,000 requests per day).

### Development

Start the development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

The app will be available at `http://localhost:5173`

### Building

To create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

### Testing

Run tests:

```sh
npm test
```

## Project Structure

```text
src/
├── lib/
│   ├── api/           # API clients (RxNorm, FDA, cache)
│   ├── calculators/   # Calculation logic
│   ├── components/    # Svelte components
│   ├── parsers/       # SIG parsing
│   ├── services/      # Business logic services
│   ├── utils/         # Utility functions
│   ├── config.ts      # Configuration
│   └── types.ts       # TypeScript types
├── routes/
│   ├── api/           # API endpoints
│   └── +page.svelte   # Main page
└── ...

docs/
├── PRD.md             # Product Requirements Document
├── ARCHITECTURE.md    # Architecture documentation
└── TASK_LIST.md       # Implementation task list
```

## Usage

1. Enter a drug name (e.g., "Aspirin") or NDC code (e.g., "12345-678-90")
2. Enter prescription instructions (SIG), e.g., "1 tablet twice daily"
3. Enter days supply OR total quantity (for reverse calculation)
4. (Optional) Provide manual override for doses per day if SIG parsing fails
5. Click "Calculate" to get NDC recommendations

## API Integration

### RxNorm API

- **Base URL**: `https://rxnav.nlm.nih.gov/REST`
- **Authentication**: None required
- Used for drug name normalization and NDC lookup

### FDA NDC Directory API

- **Base URL**: `https://api.fda.gov/drug/ndc.json`
- **Authentication**: Optional API key
- Used for package information and active/inactive status

## Documentation

### Core Documentation

- **[PRD](./docs/PRD.md)**: Product Requirements Document with detailed specifications
- **[Architecture](./docs/ARCHITECTURE.md)**: System architecture and design decisions
- **[Implementation Summary](./docs/misc/IMPLEMENTATION_SUMMARY.md)**: Feature overview and smoke testing

### User & Developer Guides

- **[User Guide](./docs/misc/USER_GUIDE.md)**: Step-by-step usage instructions for pharmacists
- **[API Documentation](./docs/misc/API.md)**: Endpoint documentation with request/response formats
- **[Developer Guide](./docs/misc/DEVELOPER.md)**: Setup instructions and development workflow
- **[Testing Guide](./docs/misc/TESTING.md)**: Testing practices and strategies
- **[Troubleshooting Guide](./docs/misc/TROUBLESHOOTING.md)**: Common issues and solutions
- **[Deployment Plan](./docs/misc/DEPLOYMENT_PLAN.md)**: GCP deployment instructions with gcloud CLI commands

## Deployment

The app is designed to deploy on Google Cloud Platform using Cloud Run or App Engine. See the [Deployment Plan](./docs/misc/DEPLOYMENT_PLAN.md) for detailed instructions.

## Contributing

1. Follow the implementation guide in [TASK_LIST.md](./docs/TASK_LIST.md)
2. Ensure all tests pass
3. Follow TypeScript and SvelteKit best practices
4. Keep error messages user-friendly for healthcare professionals

## Future Work

### Planned Features

- Enhanced SIG parsing for complex prescription instructions
- Support for additional package types and unit types
- Persistent caching (Redis) for multi-instance deployments
- Batch calculation API for multiple prescriptions
- Historical NDC tracking and change notifications

### Documentation Improvements

- Add screenshots to User Guide
- Expand troubleshooting scenarios
- Add performance optimization guide
- Create video tutorials for common workflows

## License

[Add your license here]

## Support

For questions or issues, please refer to the documentation or create an issue in the repository.
