import { ToastProvider } from "@/components/shared/Toast";
import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Terminal Zero | Ground Zero for Professional Trading",
  description: "High-frequency crypto trading simulator with real-time market data. Risk-free practice for prop firm candidates and algorithmic traders.",
  keywords: ["trading simulator", "crypto trading", "prop firm", "paper trading", "trading practice"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`} suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
