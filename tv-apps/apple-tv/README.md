# Apple TV (tvOS) app

Apple TV requires a native tvOS application built and archived with Xcode. It is not covered by the Samsung, LG or Android TV packages.

Implementation requirements:
- SwiftUI / UIKit focus engine navigation for the Siri Remote.
- Secure Firebase-backed account/session integration through supported APIs.
- Existing Streamivio catalogue and detail endpoints.
- AVPlayer-based playback with required streaming formats and DRM where applicable.
- App Store privacy disclosures, support URL, screenshots and rights documentation.

A thin website wrapper alone is unlikely to meet App Store quality expectations. Build this as a native tvOS experience after the shared API contract and authorized playback formats are verified.
