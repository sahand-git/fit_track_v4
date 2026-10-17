# Release readiness status

This is the repo-side preparation for the free beta and first Play release. It does not claim that external accounts, cloud projects, testers, or store submissions have been created.

## Prepared in this repository

- Privacy policy draft and canonical URL are in `docs/privacy.md` and `src/constants/urls.ts`. GitHub Pages must be enabled for `main` and `/docs` before that URL is live.
- Firestore emulator configuration points to the checked-in `firestore.rules` and port 8080.
- Firebase setup guide documents the project configuration and safe handling of client config and native service files.
- Beta task list and feedback questionnaire are in `docs/beta-test-guide.md`.
- Stage 3 tracks the Firestore 1 MiB document limit and the required backup-size follow-up.

## Must complete in owner accounts or on real devices

1. Create/configure Firebase Authentication and Firestore, publish `firestore.rules`, and supply the client config. The app is guest-capable without Firebase.
2. Add the documented GitHub Actions repository secrets before a CI APK is expected to support Firebase and native Google sign-in. Until then, CI should still build guest mode.
3. Configure GitHub Pages to publish the `docs` folder from `main`, then verify the policy URL on a phone.
4. Test sign-in, backup/restore/deletion, camera, barcode, notifications, health permissions, and layouts on actual Android and iOS devices.
5. Have Sorani and Arabic speakers review the exported translation table before launch. A CSV can be generated with `npm run localization:export`.
6. Recruit Play testers and manage their email addresses privately in Play Console. For applicable new personal accounts, Google currently requires 12 continuously opted-in closed-testers for 14 days before production access.
7. The current Google Play country table shows Iraq supports developer registration but not merchant registration. This means an Iraqi merchant account cannot use Play's merchant payments for paid apps/in-app purchases; confirm the account's actual country and legal seller arrangement before monetization.
8. The APK workflow's Android build is not configured with a production signing keystore. A Play upload requires setting up and safeguarding the app-signing/release process.
9. `npm run lint` currently reports existing React Hooks errors and warnings across the app. Keep it out of the release gate until those findings are reviewed and resolved rather than suppressing the rules.
10. The exported translation table is ready, but Arabic and Sorani still need review by fluent speakers. That review and any resulting corrections cannot be completed without their feedback.

## Current Firebase/Gemini cost assumptions

- Firestore currently includes daily free quotas of 50,000 reads, 20,000 writes, 20,000 deletes and 1 GiB stored data for one qualifying database. Exceeding a free quota or using paid-only features may require billing; monitor usage.
- Gemini free-tier API content may be used by Google to improve products. Paid-tier content is not used for that purpose according to Google's current pricing page. Do not use a shared API key in a client app: it can be extracted. A server proxy with authentication, per-user quotas, spend limits, and abuse monitoring is required before FitTrack pays for user AI usage.
- Do not promise a per-user AI cost until actual request volume, image sizes, prompts, model, and token usage are measured.

## Current official references checked (October 17, 2026)

- [Play Console supported developer and merchant locations](https://support.google.com/googleplay/android-developer/answer/9306917)
- [Play Console registration fee and signup requirements](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Play closed testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Firestore pricing and free quota](https://firebase.google.com/docs/firestore/pricing)
- [Gemini API pricing and data-use tiers](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API prepaid billing](https://ai.google.dev/gemini-api/docs/billing)
- [Firestore rules unit testing](https://firebase.google.com/docs/rules/unit-tests)
- [Juula Google Play listing](https://play.google.com/store/apps/details?id=com.kurddev.juulaapp) lists Awny Holdings Inc. in Surrey, British Columbia, Canada, so its ability to sell subscriptions does not demonstrate that an Iraq-based merchant profile can use Play billing.
