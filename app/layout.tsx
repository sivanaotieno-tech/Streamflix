import "./globals.css";
import OfflineSupport from "./OfflineSupport";
import DeviceExperience from "@/components/device-experience";
import { LiveClock } from "@/components/live-clock";

export const metadata = {
  title: "Streamivio",
  description: "Discover movies, series, anime and more on every screen.",
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
        <DeviceExperience />
        <LiveClock />
        {children}
      </body>
    </html>
  );
}
