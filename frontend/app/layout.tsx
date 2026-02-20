import QueryProvider from "@/components/providers/QueryProvider";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import CookieBanner from "@/components/legal/CookieBanner";
import { ToastProvider } from "@/components/shared/Toast";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Terminal Zero | Crypto Trading Simulator",
  description: "Practice crypto trading with real market data. Risk-free paper trading — no real money needed.",
  keywords: ["crypto paper trading", "trading simulator", "practice trading bitcoin", "crypto trading practice"],
  openGraph: {
    title: "Terminal Zero | Crypto Trading Simulator",
    description: "Practice crypto trading with real market data. No real money — just skill building.",
    url: "https://terminalzero.com",
    siteName: "Terminal Zero",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terminal Zero | Crypto Trading Simulator",
    description: "Practice crypto trading with real market data. Risk-free — no real money involved.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#070714" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Terminal Zero",
            "applicationCategory": "FinanceApplication",
            "description": "Crypto paper trading simulator with real market data. Practice trading without risking real money.",
            "url": "https://terminalzero.com",
            "offers": [{"@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "Free Plan"}],
            "operatingSystem": "Web Browser"
          })}}
        />
        {/* Prevent MetaMask and other wallet extensions from auto-connecting */}
        <Script id="disable-wallet-connect" strategy="beforeInteractive">
          {`
            // This app uses paper trading only - no crypto wallet required
            // Suppress any wallet extension auto-connect attempts
            if (typeof window !== 'undefined') {
              window.addEventListener('ethereum#initialized', function() {
                // Prevent wallet auto-connect
              }, { once: true });
              
              // Override ethereum request to prevent connection errors
              Object.defineProperty(window, 'ethereum', {
                configurable: true,
                get() { return undefined; },
                set() { /* ignore */ }
              });
            }
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <ToastProvider>
            {children}
            <PWAInstallPrompt />
            <ServiceWorkerRegistrar />
            <CookieBanner />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
