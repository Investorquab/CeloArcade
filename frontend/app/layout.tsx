import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NetworkGuard } from "./NetworkGuard";

export const metadata: Metadata = {
  title: "CeloArcade",
  description: "Real onchain games. Real CELO stakes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NetworkGuard />
          {children}
        </Providers>
      </body>
    </html>
  );
}
