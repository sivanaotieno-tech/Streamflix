# Streamivio Smart TV apps

This folder tracks the native TV-store deliverables while the existing Next.js/Firebase/API backend remains the single source of truth.

## Shared TV experience

- Web TV experience: `/tv` (implemented in this branch).
- Catalogue: existing `GET /api/search` endpoint.
- Details and playback: existing Streamivio movie and series detail routes.
- Branding: existing Streamivio name, colours and logo treatment.
- The TV page is remote-first: large focus targets, directional navigation and keyboard/remote activation.

## Platform targets and honest status

| Platform | Official store | Native package | Status in this branch |
| --- | --- | --- | --- |
| Android TV / Google TV | Google Play | Android APK/AAB | Requirements documented; native project not yet built |
| Amazon Fire TV | Amazon Appstore | Android APK | Requirements documented; native project not yet built |
| Samsung Smart TV | Samsung Apps TV | Tizen web app (.wgt) | Prototype shell only; not store-ready |
| LG Smart TV | LG Content Store | webOS app (.ipk) | Prototype shell only; not store-ready |
| Roku TV | Roku Channel Store | BrightScript / SceneGraph ZIP | Native implementation not yet built |
| Apple TV | Apple App Store | tvOS app (.ipa via Xcode archive) | Native implementation not yet built |

## Important release gates

These source files do not mean the apps are already published or approved. Each store requires developer enrollment, platform-specific packaging, signing, device testing, store listing assets, privacy disclosures and review. Some store programs and developer accounts have fees or regional eligibility rules.

The Samsung and LG launchers are deliberately marked as prototypes. Their public production URL is not configured, and they are not yet full store-compliant native experiences. The referenced icon assets and platform-specific signing/build steps must also be completed before packaging.

Before submission, confirm that every title and stream offered in each territory is licensed or otherwise authorized for distribution. A catalogue listing does not grant streaming rights. Store reviewers may reject apps that merely wrap a website, have broken playback, lack meaningful TV navigation, or cannot demonstrate rights to the content.

## Release order

1. Review and merge the shared `/tv` experience after a successful Vercel preview build.
2. Confirm the canonical public production domain and test the existing APIs, Firebase sign-in and playback from a TV network.
3. Build Android TV / Google TV and Fire TV as a native Android TV app with remote-first navigation and the existing secure APIs.
4. Implement and validate full Samsung Tizen and LG webOS applications on physical TVs and their store emulators; the current launcher shells are only placeholders.
5. Build Roku and Apple TV as separate native apps; they are not web packages and need their own playback and account integration.
6. Submit each platform through its official developer portal after store accounts, signing identities, privacy policy, support contact and rights documentation are ready.

## Configuration still needed

- Final public production URL (not a preview deployment).
- Official support and privacy-policy URLs.
- App-store developer accounts and signing credentials.
- TV device test access (Samsung, LG, Android/Google TV, Fire TV, Roku and Apple TV).
- Confirmation of licensed content and playback-provider permissions for each target market.

Never commit signing keys, store passwords, Firebase service-account JSON or private API credentials.
