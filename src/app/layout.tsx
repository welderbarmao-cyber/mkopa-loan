import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import SplashScreen from "@/components/splash-screen";

export const metadata: Metadata = {
  title: "M-Kopa Loans — Affordable Digital Lending",
  description: "Get personal, business, emergency & education loans from KES 5,000 to 500,000. Fast approval, mobile money disbursement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <SplashScreen />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
