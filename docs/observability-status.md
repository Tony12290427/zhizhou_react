# Observability Status

## Backend

- **Actuator**: AVAILABLE
  - `/actuator/health` — returns `{"status":"UP"}`
  - `/actuator/metrics` — endpoint exists but returns INTERNAL_ERROR (metrics subsystem may need configuration)
  - `/actuator/metrics/cache.gets` — same INTERNAL_ERROR as /metrics
- **Resilience4j**: CONFIGURED
  - Config file: `src/main/resources/application-resilience4j.yml`
  - Circuit breaker (`deepseek-llm`):
    - Sliding window size: 10
    - Minimum calls: 5
    - Failure rate threshold: 50%
    - Wait duration in open state: 30s
    - Permitted calls in half-open: 3
    - Auto transition to half-open: enabled
  - Retry (`deepseek-llm`):
    - Max attempts: 3
    - Wait duration: 500ms
    - Exponential backoff multiplier: 2
  - Time limiter (`deepseek-llm`):
    - Timeout duration: 15s
- **Metrics endpoints**: `/actuator/metrics`, `/actuator/health`

## Frontend

- **Sentry**: NOT INSTALLED
  - `@sentry/react` is not present in `package.json` dependencies
  - No Sentry initialization found in `src/main.tsx`
  - No `src/lib/observability.ts` file exists
  - No Sentry references anywhere in the `src/` directory
- **Web Vitals**: NOT CONFIGURED
  - No web-vitals library or custom performance metrics code found in `src/`
  - No CLS, FID, LCP, FCP, TTFB, or INP tracking

## Recommendations

1. **Fix /actuator/metrics**: The endpoint resolves but returns a 500-level error. Investigate the metrics subsystem configuration (likely a missing Micrometer registry or database dependency).
2. **Add Sentry**: Install `@sentry/react` and initialize it in `main.tsx` with a DSN for frontend error tracking.
3. **Add Web Vitals**: Consider adding the `web-vitals` library to track Core Web Vitals (LCP, CLS, INP) and report them to an analytics or monitoring service.
