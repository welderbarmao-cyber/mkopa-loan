import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import SplashScreen from "@/components/splash-screen";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "M-Kopa Loans — Enterprise Financial Platform",
  description: "Premium digital lending platform for Africa. Advanced admin dashboard, KYC verification, loan management, and STK push payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-ink-900 dark:bg-ink-950 dark:text-ink-50 antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <SplashScreen />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
