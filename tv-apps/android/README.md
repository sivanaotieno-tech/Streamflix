# Android TV + Fire TV

Build one native Android application with Android TV launcher metadata, D-pad focus states, leanback-compatible layouts, adaptive playback and Firebase Authentication integration. Publish separate store listings/build tracks for Google Play and Amazon Appstore where required.

The app must call the existing Streamivio API over HTTPS. Do not embed Firebase Admin credentials or Vercel secrets. Use the supported Firebase client configuration and secure session flow already used by the web app.

The actual Gradle project is intentionally not generated until the production URL, application ID, signing owner and playback SDK/DRM requirements are confirmed. These values affect package identity and store signing and should not be guessed.
