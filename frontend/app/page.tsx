"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Once wallet connects, send them straight to the game hub
  useEffect(() => {
    if (isConnected) {
      router.push("/hub");
    }
  }, [isConnected, router]);

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

      <div className="mb-3">
        <ConnectButton />
      </div>

      <button className="text-sm text-gray-400 border border-gray-700 rounded-lg px-4 py-2 hover:bg-gray-900 transition">
        Play as guest (no wallet needed)
      </button>

      <div className="flex gap-6 mt-8 text-center">
        <div>
          <p className="text-base font-medium">1,204</p>
          <p className="text-xs text-gray-500">Players</p>
        </div>
        <div className="w-px bg-gray-800" />
        <div>
          <p className="text-base font-medium">312</p>
          <p className="text-xs text-gray-500">Live rooms</p>
        </div>
        <div className="w-px bg-gray-800" />
        <div>
          <p className="text-base font-medium">89K</p>
          <p className="text-xs text-gray-500">CELO paid out</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6">🔒 Every match settled onchain</p>
    </main>
  );
}
