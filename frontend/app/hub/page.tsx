"use client";

import { useAccount, useBalance, useReadContract } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI, BOT_FAUCET_ABI } from "@/lib/contracts";
import { formatEther } from "viem";
import Link from "next/link";

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
    const res = await fetch("/api/faucet-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    alert(res.ok ? "Claim submitted! CELO will arrive shortly." : "Claim failed — try again.");
  }

  return (
    <main className="min-h-screen px-5 py-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
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

      <div className="bg-green-950 rounded-xl px-4 py-3 flex justify-between items-center mb-6">
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

      <div className="grid grid-cols-2 gap-3">
        <GameTile
          href="/quiz"
          title="Quiz Duel"
          subtitle="Fresh AI questions"
          live
          gradient="from-purple-600 to-indigo-700"
          preview={<QuizPreview />}
        />
        <GameTile
          href="/math"
          title="Quick Math"
          subtitle="Fastest wins"
          live
          gradient="from-cyan-600 to-blue-700"
          preview={<MathPreview />}
        />
        <GameTile
          href="/ludo"
          title="Ludo"
          subtitle="2-4 players"
          live
          gradient="from-red-600 to-orange-600"
          preview={<LudoPreview />}
        />
        <GameTile
          href="#"
          title="Naija Whot"
          subtitle="Coming soon"
          live={false}
          gradient="from-gray-700 to-gray-800"
          preview={<WhotPreview />}
        />
      </div>

      <p className="text-[11px] text-gray-600 text-center mt-5">
        {roomCount !== undefined ? `${roomCount.toString()} rooms created so far` : ""}
      </p>
    </main>
  );
}

function GameTile({
  href,
  title,
  subtitle,
  live,
  gradient,
  preview,
}: {
  href: string;
  title: string;
  subtitle: string;
  live: boolean;
  gradient: string;
  preview: React.ReactNode;
}) {
  const content = (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${gradient} p-3 flex flex-col overflow-hidden ${
        !live ? "opacity-50" : "active:scale-95 transition-transform"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-medium bg-black/30 text-white px-2 py-0.5 rounded-full w-fit">
          {live ? "LIVE" : "SOON"}
        </span>
      </div>

      {/* Mini mockup preview of the actual game screen */}
      <div className="bg-black/25 rounded-xl p-2.5 mb-3 h-28 flex items-center justify-center">
        {preview}
      </div>

      <p className="text-white text-sm font-semibold leading-tight">{title}</p>
      <p className="text-white/70 text-[11px] mt-0.5">{subtitle}</p>
    </div>
  );

  return live ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

function QuizPreview() {
  return (
    <div className="w-full">
      <div className="bg-white/90 rounded-md px-2 py-1 mb-1.5">
        <p className="text-[8px] text-gray-800 font-medium">What's the native token of Celo?</p>
      </div>
      <div className="flex flex-col gap-1">
        <div className="bg-blue-500 rounded px-2 py-1">
          <p className="text-[7px] text-white font-medium">CELO ✓</p>
        </div>
        <div className="bg-white/20 rounded px-2 py-1">
          <p className="text-[7px] text-white/70">MATIC</p>
        </div>
      </div>
    </div>
  );
}

function MathPreview() {
  return (
    <div className="w-full text-center">
      <p className="text-white text-lg font-bold mb-1.5">7 × 6 = ?</p>
      <div className="grid grid-cols-2 gap-1">
        {["40", "42", "36", "48"].map((n, i) => (
          <div key={n} className={`rounded px-1 py-0.5 text-[8px] font-medium ${i === 1 ? "bg-cyan-400 text-black" : "bg-white/20 text-white"}`}>
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function LudoPreview() {
  return (
    <div className="w-16 h-16 rounded-md overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5">
      <div className="bg-red-500 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/90" />
      </div>
      <div className="bg-blue-500 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/90" />
      </div>
      <div className="bg-green-500 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/90" />
      </div>
      <div className="bg-yellow-500 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/90" />
      </div>
    </div>
  );
}

function WhotPreview() {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <div className="absolute w-9 h-12 bg-white rounded-md -rotate-12 flex items-center justify-center shadow">
        <span className="text-red-600 text-xs font-bold">7♦</span>
      </div>
      <div className="absolute w-9 h-12 bg-white rounded-md flex items-center justify-center shadow z-10">
        <span className="text-black text-xs font-bold">K♠</span>
      </div>
      <div className="absolute w-9 h-12 bg-white rounded-md rotate-12 flex items-center justify-center shadow">
        <span className="text-red-600 text-xs font-bold">3♥</span>
      </div>
    </div>
  );
}
