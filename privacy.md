# Hue-istic Privacy Policy

_Effective: September 7, 2026_

Hue-istic is an Android home screen launcher that organizes your apps by color. It is
published by Peter Lacey-Bordeaux.

## Data collection

**Hue-istic collects no data.** The app's own code never transmits anything off your
device: there are no analytics, no ads, no accounts, and no tracking, and nothing in
Hue-istic itself asks for network access.

The one third-party component is Google's Play Billing library, which handles the app's
single optional in-app purchase (the six extra drawer views). The purchase itself is made
through the Google Play app on your device, with your Google account, under
[Google's privacy policy](https://policies.google.com/privacy). That library brings the
internet permission with it and may send Google its own diagnostic information about how
the library is working; Hue-istic does not control or receive that. Hue-istic itself keeps
only an on-device flag saying whether the purchase is owned, and asks Google Play whether it
still is when the app starts. We receive nothing about you from any of it.

## Data the app processes on your device

To work as a launcher, Hue-istic uses the following information. All of it stays on your
device.

- **Installed apps and their icons** — to show your app drawer and home screen, and to
  group apps by the colors in their icons. Apps in a work profile are shown alongside
  personal ones if your device has one. The color worked out for each icon is cached
  locally so the drawer opens quickly.
- **App usage statistics** (optional) — only if you grant *Usage Access* in Android
  settings. Used solely to order apps by how much you have used them over roughly the last
  30 days: in the Honeycomb and Most used views, and in any other view you leave under
  *Settings → Sort by usage*. Nothing is stored beyond what Android itself keeps; revoke the access at any time in
  system settings and every view falls back to its unsorted state.
- **Notifications** (optional) — only if you turn on badges and grant *Notification
  Access* in Android settings. Hue-istic looks at which app each notification belongs to,
  and whether it is an ongoing one (such as a music player or a download), so it can draw
  a count on that app's icon. It does not read, store, or forward the title, text, or any
  other content of your notifications, and it keeps nothing once the notification is
  dismissed. You can revoke the access at any time in system settings.
- **Your home screen layout and settings** — stored in files private to the app on your
  device. The optional *Back up layout* feature writes the layout to a file in a location
  you choose; the app never uploads it anywhere. Restoring reads a file you pick.
- **Crash reports** — if the app crashes, it writes a report (the error, your device model,
  Android version, and the app version) to its own private storage so the problem can be
  diagnosed. The app never sends these. *Settings → Share crash logs* lets you send them
  yourself, through Android's share sheet, to whoever you choose.

## Permissions the app asks for

- **Usage access** (optional, granted in system settings) — for the Honeycomb and Most used
  views and any other view that orders by usage, above.
- **Google Play billing** (granted at install, added by the Play Billing library) — lets the
  app offer its one optional in-app purchase through Google Play.
- **Notification access** (optional, granted in system settings) — for badges, above.
- **Request to delete packages** (granted at install) — lets *Uninstall* on an icon open
  Android's own uninstall confirmation. The app cannot remove anything without you
  confirming that dialog.

Hue-istic's own code asks for no other permission — not location, contacts, storage, camera
or microphone. The internet and network-state permissions that appear on the app's Play
listing are added by the Play Billing library described above, for its own diagnostics;
Hue-istic never uses them.

## Data retention and deletion

Everything the app stores lives inside its private app data. Uninstalling Hue-istic, or
using *Clear storage* for it in Android settings, deletes all of it. A layout backup you
exported is an ordinary file in the location you chose and is yours to keep or delete.

## Children

Hue-istic is not directed at children and collects no data from anyone.

## Changes

Any future change to this policy will be published here, shown in the app, and noted in the
app's release notes.

## Contact

Questions: placeybordeaux@gmail.com
