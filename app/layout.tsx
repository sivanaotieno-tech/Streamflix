import "./globals.css";
import OfflineSupport from "./OfflineSupport";
import FirebaseSessionSync from "@/components/firebase-session-sync";

export const metadata = {
  title: "Streamivio",
  description: "A legitimate movie, TV and live entertainment discovery platform.",
  applicationName: "Streamivio",
  manifest: "/manifest.json",
  icons: {
    icon: "/streamivio-icon.svg",
    shortcut: "/streamivio-icon.svg",
    apple: "/streamivio-icon.svg",
  },
};

export const viewport = {
  themeColor: "#070d17",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OfflineSupport />
        <FirebaseSessionSync />
        {children}
      </body>
    </html>
  );
}
