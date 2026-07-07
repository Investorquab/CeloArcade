"use client";

import { useAccount, useBalance, useReadContract } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI, BOT_FAUCET_ABI } from "@/lib/contracts";
import { formatEther } from "viem";

const GAMES = [
  { name: "Quiz Duel", desc: "1v1 · fresh AI questions every match", live: true, icon: "💡" },
  { name: "Quick Math", desc: "1v1 · fastest correct answer wins", live: true, icon: "🧮" },
  { name: "Ludo", desc: "2–4 players · vs friends or AI", live: true, icon: "🎲" },
  { name: "Naija Whot", desc: "Coming soon", live: false, icon: "🃏" },
];

export default function Hub() {
  const { address } = useAccount();

  const { data: balance } = useBalance({ address });

  const { data: roomCount } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "roomCount",
  });

  const { data: faucetEligibility } = useReadContract({
    address: ADDRESSES.BotFaucet,
    abi: BOT_FAUCET_ABI,
    functionName: "canReceive",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const canClaim = faucetEligibility?.[0] ?? false;

  async function handleClaim() {
    if (!address) return;
    // This calls your backend, which forwards to the bot's operator wallet,
    // which then calls BotFaucet.dispense(address) onchain.
    const res = await fetch("/api/faucet-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (res.ok) {
      alert("Claim submitted! CELO will arrive shortly.");
    } else {
      alert("Claim failed — check the console or try again in a moment.");
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-5">
        <div>
          <p className="text-xs text-gray-500">Welcome back</p>
          <p className="text-sm font-medium">
            {address ? `${address.slice(0, 6)}..${address.slice(-4)}` : "Not connected"}
          </p>
        </div>
        <div className="bg-gray-900 rounded-full px-3 py-1.5 flex items-center gap-1.5">
          <span className="text-yellow-500 text-sm">$</span>
          <span className="text-sm font-medium">
            {balance ? Number(formatEther(balance.value)).toFixed(2) : "0.00"} CELO
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-gray-400 mb-2.5">Choose a game</p>

      <div className="flex flex-col gap-2.5">
        {GAMES.map((game) => (
          <div
            key={game.name}
            className={`bg-gray-900 border border-gray-800 rounded-2xl p-3.5 flex items-center gap-3.5 ${
              !game.live ? "opacity-60" : "cursor-pointer hover:bg-gray-850"
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 text-xl">
              {game.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{game.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{game.desc}</p>
            </div>
            {game.live ? (
              <span className="bg-green-950 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                LIVE
              </span>
            ) : (
              <span className="text-gray-600">🔒</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 bg-green-950 rounded-xl px-3.5 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs font-medium text-green-400">Daily faucet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {canClaim ? "Claim 0.1 CELO to get started" : "Already claimed today"}
          </p>
        </div>
        <button
          onClick={handleClaim}
          disabled={!canClaim || !address}
          className="bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg"
        >
          Claim
        </button>
      </div>

      <p className="text-[11px] text-gray-600 text-center mt-4">
        {roomCount !== undefined ? `${roomCount.toString()} rooms created so far` : ""}
      </p>
    </main>
  );
}
