import "./globals.css";

export const metadata={
  title:"Streamivio",
  description:"A legitimate movie, TV and live entertainment discovery platform.",
  applicationName:"Streamivio",
  icons:{icon:"/icon.svg",shortcut:"/icon.svg",apple:"/icon.svg"},
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}