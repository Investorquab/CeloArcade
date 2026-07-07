"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Just the injected connector — this covers MetaMask AND MiniPay,
// since both inject a window.ethereum provider into the browser.
// No WalletConnect, no project ID, no key needed anywhere.
const config = createConfig({
  chains: [celo],
  connectors: [injected()],
  transports: {
    [celo.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
