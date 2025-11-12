# Troubleshooting Guide

## Common Issues

### Application Won't Start

**Symptoms**: Error when running `npm run dev` or `npm run build`

**Solutions**:
- Verify Node.js version: `node --version` (requires 20.19+ or 22.12+)
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `npm run check`

### Build Failures

**Symptoms**: `npm run build` fails with errors

**Solutions**:
- Ensure all dependencies are installed: `npm install`
- Check for lint errors: `npm run lint`
- Verify svelte.config.js uses `@sveltejs/adapter-node`
- Check that all required files exist (src/app.html, etc.)

### API Errors

**Symptoms**: "Drug not found" or API timeout errors

**Solutions**:
- Verify internet connection
- Check RxNorm API status: https://rxnav.nlm.nih.gov/
- For FDA API errors, verify API key is set correctly (if using)
- Check browser console for detailed error messages
- Try alternative drug names or spellings

### SIG Parsing Issues

**Symptoms**: Incorrect doses per day calculated

**Solutions**:
- Use manual override for doses per day
- Check SIG format matches common patterns (see USER_GUIDE.md)
- Verify prescription instructions are clear and unambiguous

### Deployment Issues

**Symptoms**: Cloud Run deployment fails or service won't start

**Solutions**:
- Check Dockerfile uses Node 20 (not 18)
- Verify all source files are copied in Dockerfile
- Check Cloud Run logs: `gcloud run logs read --service ndc-calculator`
- Verify environment variables are set correctly
- Check that Artifact Registry repository exists

### Performance Issues

**Symptoms**: Slow response times

**Solutions**:
- Check external API response times (RxNorm, FDA)
- Verify cache is working (responses should be faster on second request)
- Check Cloud Run instance memory/CPU allocation
- Review browser network tab for slow requests

## Debugging

### Enable Verbose Logging

Add console.log statements in:
- `src/routes/api/calculate/+server.ts` for API debugging
- `src/lib/services/calculation.ts` for calculation flow
- `src/lib/api/rxnorm.ts` and `src/lib/api/fda.ts` for API calls

### Check Cache Status

Cache is in-memory only. To clear:
- Restart the application
- Cache automatically expires after 24 hours

### Test External APIs

```bash
# Test RxNorm API
curl "https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=aspirin"

# Test FDA API (with key)
curl "https://api.fda.gov/drug/ndc.json?api_key=YOUR_KEY&search=product_ndc:\"12345-678-90\""
```

## Cloud Run Specific

### View Logs

```sh
gcloud run logs read --service ndc-calculator --region us-central1 --limit 100
```

### Check Service Status

```sh
gcloud run services describe ndc-calculator --region us-central1
```

### Common Cloud Run Errors

**Error**: "Container failed to start"
- Check Dockerfile CMD is correct: `["node", "build"]`
- Verify build output exists in `/app/build`
- Check that Node.js version matches base image

**Error**: "Permission denied"
- Verify Cloud Build service account has necessary permissions
- Check IAM roles for deployment user

## Testing

See [TESTING.md](./TESTING.md) for testing strategies and debugging test failures.

## Getting Help

1. Check this troubleshooting guide
2. Review [API Documentation](./API.md) for endpoint details
3. Check application logs (browser console or Cloud Run logs)
4. Create an issue in the repository with:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (browser, Node version, etc.)

## Additional Resources

- [User Guide](./USER_GUIDE.md) - Usage instructions
- [Developer Guide](./DEVELOPER.md) - Development setup
- [Deployment Plan](./DEPLOYMENT_PLAN.md) - Deployment instructions

