import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Import Footer with dynamic to avoid hydration issues
const Footer = dynamic(() => import('../components/Footer'), { ssr: true });
// GoogleAdsense component temporarily commented out to prevent script duplication
// const GoogleAdsense = dynamic(() => import('../components/GoogleAdsense'), { ssr: false });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Forex Events",
  description: "Real-time forex events tracker",
  other: {
    "google-adsense-account": "ca-pub-3681278136187746",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="google-adsense-account" content="ca-pub-3681278136187746" />
        {/* Add AdSense script directly */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746" 
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
        <link rel="preconnect" href="https://adservice.google.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" suppressHydrationWarning>
        {/* GoogleAdsense component temporarily removed to prevent script duplication */}
        {/* <GoogleAdsense /> */}
        <div className="flex-grow">
          <main className="flex min-h-screen flex-col">
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}
