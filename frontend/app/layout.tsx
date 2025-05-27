import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Import Footer with dynamic to avoid hydration issues
const Footer = dynamic(() => import('../components/Footer'), { ssr: true });
// Import AdSenseLoader as client component
const AdSenseLoader = dynamic(() => import('../components/AdSenseLoader'), { ssr: false });

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
        
        {/* Preconnect to AdSense domains for faster loading */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
        <link rel="preconnect" href="https://adservice.google.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
      </head>
      <body className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" suppressHydrationWarning>
        {/* Load AdSense script using client component */}
        <AdSenseLoader />
        
        {/* Ezoic Integration Script */}
        <Script id="ezoic-integration" strategy="beforeInteractive">
          {`
            var ezoicId = 1; // Replace with your actual Ezoic ID
            
            // Include Ezoic JavaScript tag
            (function() {
              var d = document, s = d.createElement('script');
              s.type = 'text/javascript';
              s.async = true;
              s.src = '//g.ezoic.net/ezoic/ezoiclitedata.go?did=' + ezoicId;
              s.addEventListener('load', function() {
                console.log('Ezoic script loaded successfully');
              });
              s.addEventListener('error', function(e) {
                console.error('Ezoic script failed to load', e);
              });
              d.getElementsByTagName('head')[0].appendChild(s);
            })();
          `}
        </Script>
        
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