'use client';

import Head from 'next/head';

export default function AdSenseMeta() {
  return (
    <Head>
      {/* AdSense meta tags */}
      <meta name="google-adsense-account" content="ca-pub-3681278136187746" />
      <meta httpEquiv="origin-trial" content="FakeOriginTrialTokenJustToMakeItWork" />
      <meta httpEquiv="Cross-Origin-Opener-Policy" content="same-origin-allow-popups" />
      <meta httpEquiv="Cross-Origin-Embedder-Policy" content="credentialless" />
      <meta httpEquiv="Cross-Origin-Resource-Policy" content="cross-origin" />
      
      {/* Preconnect to AdSense domains */}
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
      <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
      <link rel="preconnect" href="https://adservice.google.com" />
      <link rel="preconnect" href="https://tpc.googlesyndication.com" />
    </Head>
  );
} 