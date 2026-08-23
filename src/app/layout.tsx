import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Brain Control Plane",
  description: "Operator control plane for the Brain cognitive runtime",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex h-screen flex-col">
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-48 shrink-0 border-r border-cockpit-border bg-cockpit-bg md:block">
              <Nav />
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto bg-cockpit-bg p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
