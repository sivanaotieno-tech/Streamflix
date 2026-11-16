# Streamivio Smart TV apps

This folder tracks the native TV-store deliverables while the existing Next.js/Firebase/API backend remains the single source of truth.

## Shared app entry

- Web TV experience: `/tv`
- Production origin: use the approved public Streamivio production domain (do not ship a preview URL).
- Catalogue: existing `GET /api/search` endpoint.
- Details and playback: existing `/movie/[id]` and `/tv-show/[id]` routes.
- Branding: existing Streamivio name, colours and icon.

## Platform targets

| Platform | Store | Native package | Status |
| --- | --- | --- | --- |
| Android TV / Google TV | Google Play | Android APK/AAB (TV launcher + D-pad) | Scaffold next |
| Amazon Fire TV | Amazon Appstore | Android APK | Shares Android TV code, Fire TV validation required |
| Samsung Smart TV | Samsung Apps TV | Tizen web app (.wgt) | Packaging scaffold |
| LG Smart TV | LG Content Store | webOS app (.ipk) | Packaging scaffold |
| Roku TV | Roku Channel Store | BrightScript / SceneGraph ZIP | Separate native app required |
| Apple TV | Apple App Store | tvOS app (.ipa via Xcode archive) | Separate native app required |

## Important release gates

These source files do not mean the apps are already published or approved. Each store requires developer enrollment, platform-specific packaging, signing, device testing, store listing assets, privacy disclosures and review. Some store programs and developer accounts have fees or regional eligibility rules.

Before submission, confirm that every title and stream offered in each territory is licensed or otherwise authorized for distribution. A catalogue listing does not grant streaming rights. Store reviewers may reject apps that merely wrap a website, have broken playback, lack meaningful TV navigation, or cannot demonstrate rights to the content.

## Release order

1. Complete and test the shared TV web experience on real 10-foot TV browsers.
2. Build Android TV / Google TV and Fire TV as a native Android TV app with remote-first navigation and the existing secure APIs.
3. Package the same TV web experience for Samsung Tizen and LG webOS, then validate it on physical TVs and their store emulators.
4. Build Roku and Apple TV as separate native apps; they are not web packages and need their own playback and account integration.
5. Submit each platform through its official developer portal after store accounts, signing identities, privacy policy, support contact and rights documentation are ready.

## Configuration still needed

- Final public production URL (not a preview deployment).
- Official support and privacy-policy URLs.
- App-store developer accounts and signing credentials.
- TV device test access (Samsung, LG, Android/Google TV, Fire TV, Roku and Apple TV).
- Confirmation of licensed content and playback-provider permissions for each target market.

Never commit signing keys, store passwords, Firebase service-account JSON or private API credentials.
