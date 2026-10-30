import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { PrivacyProvider } from "@/components/privacy";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "saldo.", template: "%s · saldo." },
  description: "Painel pessoal de finanças",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0b0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <PrivacyProvider>{children}</PrivacyProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              border: "1px solid var(--line-strong)",
              color: "var(--ink)",
              fontSize: 13,
            },
            actionButtonStyle: { background: "var(--rose)", color: "#1a0710" },
          }}
        />
      </body>
    </html>
  );
}
