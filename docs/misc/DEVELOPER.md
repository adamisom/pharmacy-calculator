# Developer Guide

## Setup

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm 10+
- Git

### Initial Setup

```sh
# Clone repository
git clone <repository-url>
cd ndc-calculator

# Install dependencies
npm install

# (Optional) Set up environment variables
echo "VITE_FDA_API_KEY=your_key_here" > .env
```

### Verify Setup

```sh
# Check Node version
node --version  # Should be 20.19+ or 22.12+

# Run type checking
npm run check

# Run tests
npm test

# Start dev server
npm run dev
```

## Project Structure

```
src/
├── lib/
│   ├── api/              # External API clients
│   │   ├── cache.ts      # In-memory cache
│   │   ├── fda.ts        # FDA API client
│   │   ├── rxnorm.ts     # RxNorm API client
│   │   └── fetch-utils.ts # HTTP utilities
│   ├── calculators/       # Calculation logic
│   │   ├── ndc-selector.ts
│   │   ├── quantity.ts
│   │   └── reverse.ts
│   ├── components/        # Svelte components
│   ├── parsers/          # SIG parsing
│   │   ├── sig.ts
│   │   └── sig-patterns.ts
│   ├── services/         # Business logic
│   │   ├── calculation.ts
│   │   └── validation.ts
│   ├── utils/            # Utilities
│   │   └── errors.ts
│   ├── config.ts         # Configuration
│   └── types.ts          # TypeScript types
├── routes/
│   ├── api/              # API endpoints
│   │   └── calculate/
│   └── +page.svelte      # Main page
└── ...
```

## Development Workflow

### Running Locally

```sh
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```sh
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run check
```

### Testing

```sh
# Run tests
npm test

# Run tests in watch mode
npm run test:unit
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

## Code Style

### TypeScript

- Use strict type checking
- Prefer interfaces over types for object shapes
- Use `unknown` instead of `any`
- Export types from `src/lib/types.ts`

### Svelte

- Use TypeScript for component scripts
- Keep components focused and reusable
- Use props for data, events for actions
- Follow Svelte 5 conventions

### Error Handling

- Use `UserFriendlyError` for user-facing errors
- Provide actionable error messages
- Log technical errors to console
- Never expose internal errors to users

### Naming Conventions

- Files: `kebab-case.ts` or `PascalCase.svelte`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

## Adding Features

### New API Endpoint

1. Create `src/routes/api/{endpoint}/+server.ts`
2. Export `POST`, `GET`, etc. handlers
3. Use `json()` helper for responses
4. Handle errors with user-friendly messages

### New Component

1. Create `src/lib/components/ComponentName.svelte`
2. Define props with TypeScript
3. Export component
4. Add to main page or relevant route

### New Calculation

1. Add function to `src/lib/calculators/`
2. Write unit tests
3. Integrate into `calculation.ts` service
4. Update types if needed

## External APIs

### RxNorm API

- Base URL: `https://rxnav.nlm.nih.gov/REST`
- No authentication required
- Rate limits: Not documented (low volume acceptable)

### FDA NDC Directory API

- Base URL: `https://api.fda.gov/drug/ndc.json`
- API key optional (increases rate limits)
- Rate limits: 1,000/day without key, 120,000/day with key

## Caching

- In-memory cache with 24-hour TTL
- Cache keys: `{service}:{type}:{identifier}`
- Cache resets on application restart
- No persistent storage (acceptable for low volume)

## Contributing

1. Create a feature branch
2. Make changes following code style
3. Write/update tests
4. Ensure all tests pass: `npm test`
5. Ensure linting passes: `npm run lint`
6. Submit pull request

### Pull Request Checklist

- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Code follows style guidelines
- [ ] Error messages are user-friendly
- [ ] Documentation updated if needed

## Debugging

### Local Development

- Use browser DevTools for frontend debugging
- Use `console.log` for server-side debugging
- Check Network tab for API calls
- Use Svelte DevTools browser extension

### Testing

- Run tests in watch mode: `npm run test:unit`
- Use `console.log` in test files for debugging
- Check test coverage if needed

## Deployment

See [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md) for deployment instructions.

## Additional Resources

- [SvelteKit Docs](https://kit.svelte.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Docs](https://vitest.dev/)
- [Architecture Documentation](../ARCHITECTURE.md)

