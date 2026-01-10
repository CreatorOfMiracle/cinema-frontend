import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Cinema cashier",
  description: "Sessions and bookings management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </Providers>
        <Toaster richColors />
      </body>
    </html>
  );
}

