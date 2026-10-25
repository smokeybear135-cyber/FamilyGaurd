FAMILYGUARD — NO ANDROID STUDIO REQUIRED

Two choices:

A) EASIEST: WEBSITE SHORTCUT WITH FAMILYGUARD LOGO
  1. On Windows extract this package and go into FamilyGuard_Website.
  2. Install Node.js from https://nodejs.org/ (Windows PC only).
  3. Run START_FAMILYGUARD_WEBSITE_WINDOWS.bat and leave it running.
  4. On the PC run ipconfig to find your IPv4 address, e.g. 192.168.1.20.
  5. Connect Samsung and PC to the same Wi-Fi; on Samsung Chrome open http://YOUR-PC-IP:3000.
  6. Chrome 3-dot menu > Add to Home screen. Android will show a FamilyGuard icon.
  NOTE: On a local http:// IP, this may only add a shortcut, not install a full PWA.
  A hosted HTTPS site can be installable as a standalone web app.

B) ANDROID APK WITHOUT ANDROID STUDIO
  See APK_Cloud_Build/README_BUILD_WITHOUT_ANDROID_STUDIO.md for steps using GitHub Actions.
  A GitHub account and upload/build steps are required. No precompiled APK is included.

LIMITATIONS
  Both versions need the separate website server (on LAN unless hosted).
  QR pairing, saved settings, bonus time and in-website requests are supported.
  Neither variant locks the phone, restricts real app downloads or uninstallation,
  filters Google/YouTube, performs actual antivirus scans, or tracks other apps.
  Age filtering is only for a tiny sample library inside FamilyGuard.
  Do NOT upload real children's personal details to an unreviewed test server.

