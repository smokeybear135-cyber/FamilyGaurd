# FamilyGuard — website edition (Version 3)

A browser-only FamilyGuard **prototype** for Android, iPhone, and Windows. No app/APK, Android Studio, Apple ID, or App Store download needed. A simple website with a logo, parent/child accounts, QR code pairing and saved data.

## What really works

- Parent registration and sign in using a **username or email + password**; no phone number field.
- A **one-time, 5-minute QR link** shown to a signed-in parent.
- Child scans the QR on the parent's phone with their phone camera and enters **name, age and email**. No child password needed.
- Child stays signed in on that browser. If the session expires or the browser is cleared, scanning a **new QR with the same child email** reconnects their saved profile and settings. Parent and child use the same server and can open it on **Android, iPhone and PC**.
- Saved parent accounts, child profiles, daily time settings, downtime settings, bonus minutes, consent-based one-off shared location, website-tab usage samples, and app request/approval decisions.
- Parent confirms a child's age. Age filtering applies **only to an example learning catalogue in FamilyGuard**.
- The website refreshes the dashboards periodically (roughly every 18 seconds) while tabs are open.
- Parent can end supervision or permanently delete a child's records (parent password required).
- Saved database is a server-side JSON file. Restarting the server does not clear it.

## What a website CANNOT do

A website cannot lock Android/iPhone entirely, monitor usage of other apps, prevent app uninstallation, block posting in YouTube/Instagram/Facebook, alter Google search history, block actual Google Play/App Store downloads, or run a whole-device antivirus scan. App approvals here are **requests recorded within FamilyGuard**, not OS store approvals. Screen-time counting is an approximate sample of time in the visible, active FamilyGuard **website**, not phone usage. Geolocation is **one-time and permission-based**, not automatic background tracking. Children can close the browser or clear website data.

**Do not use real children's names, emails, or locations with the demo until it has undergone a security/privacy audit and is deployed with HTTPS, verified parental identities, backups, and appropriate data-protection controls.**

## Quick start on Windows 11

1. Install **Node.js LTS** from https://nodejs.org/ onto your **Windows PC** (not your phone).
2. Extract this ZIP fully. Open the `FamilyGuard_Website` folder.
3. Double-click **START_FAMILYGUARD_WEBSITE_WINDOWS.bat**. Keep the console window open.
4. On the PC, visit http://localhost:3000 in Chrome or Edge.
5. Open Command Prompt and run `ipconfig`. Find the PC's **IPv4 Address** (for example `192.168.1.20`).
6. Connect the parent and child phones to the **same home Wi-Fi network** as the PC. On **both** phones, browse to `http://192.168.1.20:3000` (replace the example IP with your PC's real IPv4 address). Do **not** use `localhost` on the phones.
7. Create a **parent** account on the parent's phone. Choose **Generate pairing QR code**.
8. On the child phone, use the Camera app to scan the QR shown on the parent phone. Tap the link. Enter **name, age and email**. The device is linked.
9. The parent can now set the daily allowance, downtime, bonus time and confirm age, and respond to requests. These settings are stored on the PC and visible to both devices.

If scanning the QR does not open a working page, check: (a) both phones can browse the PC IP URL; (b) the Windows firewall allows inbound **TCP port 3000** on a **Private** network; (c) the computer is still on; (d) the QR was generated while the parent was visiting the **PC-IP URL**, not `localhost`.

**The PC must remain on and the server running.** The website is not hosted on the public Internet. This Wi-Fi demo will not normally work remotely from mobile data or another home without hosting.

### For technically experienced users

Run `node server.js` in the folder (Node 18+; no `npm install` needed, no external Node dependencies). Environment options: `PORT=3000`, `FAMILYGUARD_DATA_DIR=/your/persistent/data`, and, only with correctly configured HTTPS hosting, `FAMILYGUARD_PUBLIC_URL=https://your-domain.example`. A `Dockerfile` and `compose.yaml` are also included. If you run this on a public host, use a persistent disk/volume (ephemeral host storage wipes saved data) and HTTPS. Production hosting also needs independent security, privacy and abuse-prevention work before personal child information is entered.

## Where your information is saved

The server stores persistent records at `data/familyguard.json`, unless `FAMILYGUARD_DATA_DIR` overrides the directory. Data is **not** stored in the ZIP or automatically uploaded to any cloud. This includes profiles, parent password *hashes* (never plaintext), session records, device pairing status, recorded in-site usage, app requests, and any optionally shared one-off location. Protect this file. **Back up this folder**, especially before deleting or upgrading the site. Double-click `BACKUP_SAVED_DATA_WINDOWS.bat` to save a timestamped copy. The child browser also stores a login token so they stay signed in; clearing browser storage signs them out and a new QR pairing may be needed.

### Quick demo check

1. Parent signs in and generates QR.
2. Child scans and joins with test details.
3. Refresh parent dashboard: child appears.
4. Parent adds 20 bonus minutes and saves.
5. Child reloads page: new allowance is shown.
6. Child requests a sample app; parent approves; child sees result.
7. Stop/start server: family accounts and settings remain saved.

## Data use & limitations

This is a local demonstration not a production-ready child-safety service. No service is collecting your children's data without the server you run. It **does not** verify email ownership; a child account is created from a one-time QR link, making safe handling of that link important. Parent should verify consent and age. Age rating search is limited to built-in sample materials; Google, other websites and phone apps are unaffected. Time plan/downtime are **informational**, not enforceable device limits. A family that needs enforceable device-level parental controls should use built-in Android Family Link and Apple Screen Time as appropriate.


## Home-screen / installable website (no Android Studio)

This package now includes a **web app manifest and FamilyGuard home-screen icons**.
On Android, while FamilyGuard is open in Chrome, choose the three-dot menu and **Add to Home screen**. On a local HTTP address Chrome may offer only a website **shortcut**; full installed PWA behaviour requires a public or private **HTTPS** address (or `localhost` on that device). From another device `http://192.168...` is **not** a secure context. On iPhone, use Safari → Share → Add to Home Screen. Chrome/Safari menus may vary.

The site still needs the running Windows server and same Wi-Fi, unless it is separately hosted with HTTPS. Adding the icon does **not** give it phone-locking or device-management permissions.
