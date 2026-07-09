"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { useEffect } from "react";

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== celo.id;

  // Try automatically once whenever we detect the wrong network
  useEffect(() => {
    if (wrongNetwork) {
      switchChain({ chainId: celo.id });
    }
  }, [wrongNetwork, switchChain]);

  if (!wrongNetwork) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-black text-sm px-4 py-2.5 flex items-center justify-between gap-3">
      <span>⚠️ Wrong network — CeloArcade only works on Celo mainnet.</span>
      <button
        onClick={() => switchChain({ chainId: celo.id })}
        disabled={isPending}
        className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-60"
      >
        {isPending ? "Switching..." : "Switch to Celo"}
      </button>
    </div>
  );
}
