import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Import Footer with dynamic to avoid hydration issues
const Footer = dynamic(() => import('../components/Footer'), { ssr: true });

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
      <body className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" suppressHydrationWarning>
        {/* Google AdSense Script */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3681278136187746"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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
