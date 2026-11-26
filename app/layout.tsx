import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"ZENIT — See the whole picture",description:"Une vision centrale de vos produits numériques, de vos données et de vos performances.",metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://zenit.onrender.com")};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>;}