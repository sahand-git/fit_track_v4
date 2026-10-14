# Stage 3 — Release-readiness risks and follow-ups

This list is a release planning record, not a claim that each item has been completed.

## Firestore cloud backup document-size limit

- Firestore allows a maximum document size of **1 MiB (1,048,576 bytes)**. The current cloud-backup client estimates size as JavaScript string length × 2 and rejects above 750,000; this is a UTF-16-based approximation, not an exact UTF-8 serialized Firestore document measurement. Validate actual document overhead and margin.
- Add a test around payload sizes near the application threshold and near Firestore's hard limit. Measure serialized UTF-8 byte size, not JavaScript string character count.
- Ensure the error is shown before the upload and offers local export; never silently truncate history.
- If real user histories can exceed the safe document budget, design chunked backups (manifest plus bounded per-period documents or Storage object) with versioning, integrity checks, ownership rules, restore validation, and rollback. Do not split data ad hoc in the client.
- Test backup/restore near and above the limit, interrupted writes, partial chunk cleanup, account isolation, and restore rollback before shipping cloud backup broadly.

## Other launch gates

- Complete the device and localization evidence in [Stage 1 QA checklist](stage-1-qa-checklist.md).
- Before offering paid AI, complete the proxy/quota/spend design gate in [Stage 2 premium AI design](stage-2-premium-ai-design.md); billing itself is intentionally out of scope here.
- Verify Firebase project configuration, published Firestore rules, email verification, Google sign-in configuration, account deletion, and privacy disclosures using production-like test accounts.
- Validate native builds, camera/barcode permissions, notifications, health permissions, and store listing disclosures on real Android and iOS devices.
- Complete privacy policy, nutrition/AI disclaimers, data retention/deletion behavior, crash monitoring, and a tested support/contact path.

Firestore source: [Firestore quotas and limits](https://firebase.google.com/docs/firestore/quotas).
