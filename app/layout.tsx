import "./globals.css";
export const metadata={title:"Streamflix",description:"Your personal movie and TV discovery experience."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}