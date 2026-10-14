# Stage 2 — Premium and AI design (proposal only)

**No billing or paywall implementation is included.** This short design note is for validating product value and operating cost before selecting a price or building entitlements.

## Premium value hypothesis

Keep essential daily logging, nutrition targets, water, workouts, history, and data export available to everyone. Premium should sell useful outcomes, not access to a user's own records:

- Higher, clearly stated monthly allowance for AI Coach conversations, meal-description estimates, and photo meal analysis.
- Personalized weekly/monthly trend summaries based on the user's own logs, with transparent explanations and no medical diagnosis.
- Optional structured meal/workout plans and reminders that the user can edit or dismiss.
- Cross-device backup can remain an account feature; do not make users pay to export their data.

Validate the set with interviews and a small usage study. In particular, measure which AI jobs users repeat and whether they value coach history, photo scans, or trend reports enough to pay. Do not promise unlimited AI until measured costs support it.

## Illustrative Gemini cost estimate

Current Gemini 3.8 Flash introductory Standard pricing is $0.75 per 1M input tokens and $3.75 per 1M output tokens through December 31, 2026; the official page says standard rates change January 1, 2027. Prices and model availability must be rechecked before launch.

Example budget per active user per month, before taxes, Firebase, image storage, support, and app-store fees:

| Usage assumption | Estimated model cost |
|---|---:|
| 100 Coach/text requests, each 2,000 input + 500 output tokens | $0.34 |
| 20 photo analyses, each 3,000 input + 500 output tokens | $0.08 |
| **Illustrative total** | **about $0.42 / active user / month** |

This estimate counts input and output at the published rates but does not predict actual image tokenization, retained chat context, retries, or unbilled/failed calls. Thinking tokens count toward output usage. Budget at least a 2–4x reserve until real token-usage telemetry is measured; enforce per-account quotas and a global spend ceiling. At 10,000 similarly active users the illustrative base is about $4,200/month before that reserve.

## Do we need a proxy?

**Yes, if FitTrack pays for Gemini requests.** An API key shipped in a mobile app can be extracted; SecureStore protects local-at-rest storage but does not turn a distributed provider key into a server secret. Put provider credentials on a backend proxy that verifies Firebase identity, applies per-user and global quotas, limits request size/history, validates feature access, records token usage and cost, and returns sanitized errors. Restrict and rotate provider credentials and alert on spend.

An optional bring-your-own-key mode can remain a separate advanced path, clearly explaining that the user supplies and pays for their own key. Do not route a user's key through FitTrack's paid account without explicit consent.

## Decision gates before billing work

1. Confirm premium feature set and supported languages with users.
2. Measure real input/output token distributions for Coach, text estimation, and photo analysis.
3. Choose monthly AI allowance and price with the reserve, store fees, taxes, and service costs included.
4. Implement the proxy and server-enforced entitlements before exposing a paid tier.
5. Test quota exhaustion, cancellation/refund entitlement behavior, and account deletion before launch.

Pricing source: [Gemini 3.8 Flash guide](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8).
