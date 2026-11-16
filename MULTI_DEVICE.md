# Streamivio multi-device experience

The same Streamivio Next.js application is designed to adapt to phones, tablets, laptops, desktops and supported Smart TV browsers. It keeps the existing Streamivio branding, Firebase sign-in and current API/backend.

## Device experience

- **Phones:** responsive touch UI, installable PWA, safe-area spacing and the existing mobile navigation.
- **Tablets:** responsive layout using the same routes, account and catalogue.
- **Laptops and desktops:** the full web experience with keyboard and pointer interaction.
- **Smart TVs:** TV-browser detection enables larger focus targets, a visible remote-control focus ring and directional navigation with the arrow keys. Enter/OK activates the focused control; Back/Escape returns to the previous page when browser history is available.

## Install

- Android: open Streamivio in Chrome and choose Install app / Add to Home screen.
- iPhone/iPad: open in Safari, choose Share, then Add to Home Screen.
- Desktop: use the install icon in a supported browser's address bar or browser menu.
- Smart TV: open the deployed Streamivio URL in the TV's browser where supported.

## Official TV app stores

This web/PWA update does **not** by itself publish native store apps. Official distribution requires platform-specific builds, developer accounts, signing and store review:
- Android TV / Google TV and Fire TV: Android TV-compatible app package and store submission.
- Samsung Smart TV: Tizen TV application and Samsung seller/store submission.
- LG Smart TV: webOS TV application and LG developer/store submission.
- Apple TV: tvOS application and App Store Connect submission.

The TV web experience is the shared first step. Native store packages should reuse the existing Streamivio API and Firebase account system rather than creating a separate service or login.
