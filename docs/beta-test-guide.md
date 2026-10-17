# FitTrack beta test guide

## Before inviting testers

- Install the APK from the GitHub release on a real Android phone.
- Test guest mode first. Account sign-in requires a configured Firebase project; Google sign-in also requires a native build with the matching OAuth fingerprints.
- Ask testers not to enter sensitive health information or upload sensitive meal photos while using a free Gemini API tier.
- Give each tester the same weekly tasks and ask them to report app version, phone model, Android version, steps to reproduce, and a screenshot or screen recording when useful.

## Weekly tasks

1. Log meals on five different days, including one barcode lookup and one manual/custom food if available.
2. Try one AI feature only if they have their own Gemini key; confirm the estimate can be reviewed before it is saved.
3. Record a workout, review steps and calorie adjustment, and test the supplement checklist and reminder settings.
4. Change language to Arabic or Sorani Kurdish and report clipped text, incorrect meaning, direction, or date/number formatting.
5. Export a local backup, then report whether the file can be shared and imported.

## Feedback form questions

1. Phone model and Android version?
2. Which FitTrack version did you test?
3. Did you complete the assigned meal, workout, step, supplement, and backup tasks?
4. What was confusing or hard to find?
5. Did any text overlap, truncate, or display in the wrong direction? Include language and screenshot.
6. Did any action lose data, freeze, crash, or show an unclear error? Give exact steps.
7. Which feature would make you use FitTrack every week?
8. Would you pay for premium features? If yes, what price range and which features?

## Google Play closed test

For newly created personal Play developer accounts subject to Google's current requirement, keep at least 12 testers opted in continuously for 14 days before applying for production access. Recruit more than 12 to allow for dropouts. Collect tester Google account addresses yourself and add them in Play Console; do not place addresses in the repository or public issues. See [Google Play's current testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465).
