# Testing Guide

## Overview

The project uses **Vitest** for unit testing. Tests are located alongside source files with `.test.ts` extension.

## Running Tests

```sh
# Run all tests
npm test

# Run tests in watch mode
npm run test:unit

# Run specific test file
npm run test:unit src/lib/calculators/quantity.test.ts
```

## Test Structure

### Example Test File

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from './module';

describe('functionToTest', () => {
  it('should handle normal case', () => {
    expect(functionToTest(input)).toBe(expected);
  });

  it('should handle edge case', () => {
    expect(functionToTest(edgeInput)).toBe(expected);
  });
});
```

## Test Coverage

Current test coverage includes:
- Quantity calculations (`quantity.test.ts`)
- SIG parsing (`sig.test.ts`)
- Input validation (`validation.test.ts`)
- Reverse calculations (`reverse.test.ts`)
- NDC selection algorithm (`ndc-selector.test.ts`)
- RxNorm API utilities (`rxnorm.test.ts`)

## Testing Strategies

### Unit Tests

Test individual functions in isolation:
- Pure functions (calculators, parsers)
- Utility functions
- Validation logic

### Integration Tests

Test component interactions:
- Service layer (calculation.ts)
- API endpoints
- Component integration

**Note**: Integration tests are not currently implemented. Add more integration testing here as needed.

## Mocking

### External APIs

Mock external API calls in tests:
- Use Vitest's `vi.mock()` for module mocking
- Mock fetch calls for API clients
- Use test fixtures for API responses

### Example Mock

```typescript
import { vi } from 'vitest';

vi.mock('$lib/api/rxnorm', () => ({
  normalizeDrugInput: vi.fn().mockResolvedValue({
    rxcui: '123',
    name: 'Test Drug'
  })
}));
```

## Test Data

### Test Fixtures

Create test fixtures for:
- API responses (RxNorm, FDA)
- Sample prescriptions
- Expected calculation results

**Placeholder**: Add test fixtures directory and examples here.

## Writing Tests

### Best Practices

1. **Test behavior, not implementation**
   - Test what the function does, not how it does it
   - Focus on inputs and outputs

2. **Test edge cases**
   - Empty inputs
   - Boundary values
   - Invalid inputs

3. **Keep tests focused**
   - One assertion per test (when possible)
   - Clear test names describing the scenario

4. **Use descriptive names**
   - Test names should describe the scenario
   - Example: `should calculate overfill when packages exceed needed quantity`

### Test Categories

- **Happy path**: Normal, expected inputs
- **Edge cases**: Boundary values, empty inputs
- **Error cases**: Invalid inputs, API failures
- **Integration**: Multiple components working together

## Debugging Tests

### Common Issues

**Test fails unexpectedly**:
- Check test data matches expected format
- Verify mocks are set up correctly
- Check for async/await issues

**Tests pass locally but fail in CI**:
- Check for environment-specific code
- Verify all dependencies are installed
- Check for timing issues in async tests

**Mock not working**:
- Verify mock is set up before imports
- Check mock function signature matches
- Ensure mock is reset between tests if needed

## Test Maintenance

### When to Add Tests

- New features require tests
- Bug fixes should include regression tests
- Refactoring should maintain or improve test coverage

### When to Remove Tests

- Tests that no longer reflect requirements
- Duplicate tests testing the same behavior
- Tests that are too brittle (testing implementation details)

**Note**: Current test suite focuses on high-value business logic. Low-value tests (e.g., simple getters/setters) are intentionally excluded.

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch

**Placeholder**: Add CI configuration details and test reporting here.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://vitest.dev/guide/best-practices.html)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)

