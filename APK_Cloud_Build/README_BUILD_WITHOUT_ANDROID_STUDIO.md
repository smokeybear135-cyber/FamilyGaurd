# FamilyGuard Android APK — no Android Studio on your computer

This Android app is a **launcher for the FamilyGuard V3 website**. It is not a finished parental-control product. It does not control phone-wide lockouts, app installs, uninstalling, tracking or filtering outside the FamilyGuard website.

## Build a real APK using GitHub's online computer

You need a GitHub account and a Windows PC browser but you do **not** need Android Studio or an Android SDK.

1. Create a new **private** repository at https://github.com/new. Name it `familyguard-apk`, leave it empty, then choose **Create repository**.
2. Extract `FamilyGuard_APK_Cloud_Build.zip` on your PC. Upload the CONTENTS of the extracted folder — `app`, `.github`, `build.gradle`, `settings.gradle`, and `gradle.properties` — to the root of that repository. GitHub: **Add file → Upload files**. Do not upload just the ZIP, and do not put everything inside an extra `APK_Cloud_Build` folder.
3. Commit the uploaded files. GitHub should discover `.github/workflows/build-apk.yml`. If the upload doesn't include `.github`, create `.github/workflows/build-apk.yml` manually through **Add file → Create new file** and paste the provided YAML's content.
4. Click your repository's **Actions** tab and select **Build FamilyGuard Android APK**. Select **Run workflow** (or open the automatic run after your upload).
5. On success (green check mark), open the completed run, scroll to **Artifacts**, and download **FamilyGuard-Android-APK**.
6. Extract that downloaded artifact ZIP on your PC. It should contain `app-debug.apk`.
7. Transfer `app-debug.apk` to the Samsung phone by USB cable. Tap the APK in **My Files → Downloads** and allow this installation if prompted; turn that setting off after installing.
8. Keep the *separate* FamilyGuard V3 website server running on your Windows PC. On your phone, open the new FamilyGuard app and enter `http://YOUR-PC-IP:3000`, replacing the IP with the IPv4 address shown by `ipconfig` on your PC. They must be on the same Wi-Fi.
9. For QR pairing, scan the QR using the phone Camera. It opens the child join page in Chrome. If you'd rather enrol *inside* the Android app, **copy the QR link and paste it into the `Server / QR link` field** in the app.

**No APK is prebuilt in this ZIP.** GitHub's automated build makes it. A successful build is not guaranteed if Google/GitHub changes its build tooling; check the workflow logs if it fails. This is only suitable for trying with **test accounts**, not with real children's personal data.

## Troubleshooting
- **Can't see workflow**: `.github/workflows/build-apk.yml` was not committed at the repo root.
- **Build error**: Open the failed job in Actions, expand the first red step, then share a screenshot of the error.
- **App can't connect**: Check the Windows server is still running, use the PC's IP (not `localhost`), ensure same Wi-Fi, and check Windows Firewall permits port 3000 on a private LAN.
- **Child linked in Chrome but not app**: Browser sign-in doesn't automatically share with WebView. Copy/paste the current QR link inside the app to join in the app itself.
- **Location doesn't work**: Background location is not implemented; browser/WebView geolocation typically requires HTTPS and appropriate permissions.

This debug APK is self-signed for testing, not Play Store production release.
