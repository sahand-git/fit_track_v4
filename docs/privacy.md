---
title: FitTrack Privacy Policy
permalink: /privacy/
---

# FitTrack Privacy Policy

**Effective date: October 17, 2026**

FitTrack is a fitness and nutrition tracking app. This policy explains what information the app uses, where it is stored, and when it is sent to another service.

## Information stored on your device

Meal logs, calorie and macro totals, workout records, weight history, water intake, supplement routines, reminder preferences, and profile settings are stored locally on your device. They remain on the device unless you choose to export them or use an optional cloud backup. Your Gemini API key is stored in the device's secure storage and is not included in backups.

FitTrack can request access to camera or photo library content when you choose barcode scanning or AI meal-photo analysis. A selected meal photo is sent to Google's Gemini API for analysis. Step totals may be read from Apple Health or Android Health Connect when you enable the related permission. Reminders are scheduled as local device notifications.

## Optional account and cloud backup

You can use FitTrack as a guest without creating an account. If you choose to create an account or sign in, Firebase Authentication processes your email address or Google account identity. FitTrack does not request Gmail access.

Cloud backup and restore are manual actions. When you start a backup, FitTrack sends the supported backup data for your signed-in account to Cloud Firestore. The backup can include your profile, daily logs, supplement routine, weight history, and reminder settings. It does not include your Gemini API key. Firestore rules restrict access to the authenticated account owner; email/password users must verify their email before cloud backup is available.

Deleting your FitTrack account removes its Firebase account and cloud backup. Local records on the device remain available as guest data. You can also export a local backup from the app. Keep exported backup files private because they contain personal fitness information.

## Gemini AI features

If you configure your own Gemini API key and use AI meal estimates, meal-photo analysis, or AI Coach, FitTrack sends the prompt and relevant meal, image, or goal context to Google's Gemini API. The request goes directly from the app to Google; FitTrack does not operate an AI proxy server. Google's handling of API content depends on the API service, billing tier, and Google's current terms. Google currently states that free-tier content may be used to improve its products and paid-tier content is not used for that purpose. Review Google's current [Gemini API terms](https://ai.google.dev/gemini-api/terms) and [data-use guidance](https://ai.google.dev/gemini-api/docs/usage-policies) before sending sensitive information. Do not submit information you do not want processed by Google.

AI-generated nutrition estimates and coaching are informational, may be inaccurate, and are not medical advice.

## Service providers

FitTrack uses Google Firebase for optional account sign-in and manual cloud backup, and Google's Gemini API for AI features you choose to use. Your device platform may process data needed for permissions, health integrations, secure storage, and notifications. FitTrack does not sell personal information and, as of this policy's effective date, does not include an advertising or analytics SDK.

## Your choices and contact

You can use guest mode, decline camera/photo/health permissions, avoid AI features, and avoid cloud backup. You can export local data, sign out, or delete your account and its cloud backup in the app. To ask a privacy question or request help, contact [sahandabas2@gmail.com](mailto:sahandabas2@gmail.com).

## Policy changes

This policy may be updated when FitTrack's data practices change. The effective date above will be updated when a new version is published.
