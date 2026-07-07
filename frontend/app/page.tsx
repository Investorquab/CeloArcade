"use client";

import { useAccount, useConnect, useSwitchChain, useChainId } from "wagmi";
import { celo } from "wagmi/chains";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const router = useRouter();

  // Once connected, make sure we're on Celo — if not, switch automatically
  useEffect(() => {
    if (isConnected && chainId !== celo.id) {
      switchChain({ chainId: celo.id });
    }
  }, [isConnected, chainId, switchChain]);

  // Once connected AND on the right network, go to the hub
  useEffect(() => {
    if (isConnected && chainId === celo.id) {
      router.push("/hub");
    }
  }, [isConnected, chainId, router]);

  function handleConnect() {
    const connector = connectors[0]; // the injected connector (MetaMask/MiniPay)
    connect({ connector });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-5">
        <span className="text-3xl">🎮</span>
      </div>

      <h1 className="text-2xl font-medium mb-2">CeloArcade</h1>
      <p className="text-sm text-gray-400 mb-8 leading-relaxed">
        Real onchain games. Real CELO stakes.
        <br />
        Play against friends or AI.
      </p>

      <button
        onClick={handleConnect}
        disabled={isPending}
        className="bg-blue-600 disabled:bg-gray-700 text-white text-sm font-medium px-6 py-3 rounded-xl mb-3 flex items-center gap-2"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>

      <p className="text-xs text-gray-500 mb-6">Works with MetaMask and MiniPay</p>

      <p className="text-xs text-gray-500 mt-2">🔒 Every match settled onchain</p>
    </main>
  );
}
