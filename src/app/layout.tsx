import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Tribe Marketing Dashboard",
  description: "Persoonlijk marketing- en businessdashboard voor Tribe Marketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";
  const isLogin = pathname === "/login";

  return (
    <html lang="nl">
      <body>
        {isLogin ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 p-4 pt-20 md:p-10 overflow-auto min-h-screen" style={{ backgroundColor: "#F5F4F0" }}>
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
