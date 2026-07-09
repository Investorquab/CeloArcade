"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI } from "@/lib/contracts";
import { parseEther, formatEther, zeroAddress } from "viem";
import { useRouter } from "next/navigation";

const GAME_TYPE_QUIZ = 1;

export default function QuizLobby() {
  const { address } = useAccount();
  const router = useRouter();

  const [isFree, setIsFree] = useState(true);
  const [stake, setStake] = useState("0");
  const [vsAI, setVsAI] = useState(true);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: openRoomIds, refetch: refetchOpenRooms } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "getOpenRooms",
    args: [20n],
    query: { refetchInterval: 5000 },
  });

  const { data: liveRoomCount } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "roomCount",
    query: { enabled: isSuccess },
  });

  useEffect(() => {
    if (isSuccess) {
      refetchOpenRooms();
      if (liveRoomCount !== undefined && liveRoomCount > 0n) {
        router.push(`/quiz/room/${liveRoomCount - 1n}`);
      }
    }
  }, [isSuccess, refetchOpenRooms, liveRoomCount, router]);

  function handleCreateRoom() {
    if (!address) return;
    const stakeWei = parseEther(stake || "0");
    writeContract({
      address: ADDRESSES.GameRooms,
      abi: GAME_ROOMS_ABI,
      functionName: "createRoom",
      args: [GAME_TYPE_QUIZ, 2, stakeWei, vsAI],
      value: stakeWei,
    });
  }

  return (
    <main className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <button onClick={() => router.push("/hub")} className="text-sm text-gray-400 mb-4">
        ← Back to hub
      </button>

      <h1 className="text-xl font-medium mb-1">Quiz Duel</h1>
      <p className="text-sm text-gray-500 mb-6">Fresh AI-generated questions every match</p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <p className="text-sm font-medium mb-3">Create a match</p>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1.5">Mode</p>
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => { setIsFree(true); setStake("0"); }}
              className={`flex-1 py-2 rounded-lg text-sm ${isFree ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400"}`}
            >
              Play for free
            </button>
            <button
              onClick={() => { if (!vsAI) { setIsFree(false); setStake("0.1"); } }}
              disabled={vsAI}
              className={`flex-1 py-2 rounded-lg text-sm ${!isFree ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"} ${vsAI ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Stake CELO
            </button>
          </div>
          {vsAI && (
            <p className="text-[11px] text-yellow-500">
              ⚠️ Staking vs AI is temporarily disabled until a contract fix ships.
            </p>
          )}
          {!isFree && (
            <input
              type="number"
              step="0.01"
              min="0.001"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none mt-2"
            />
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">Play vs AI</p>
          <button
            onClick={() => {
              const newVsAI = !vsAI;
              setVsAI(newVsAI);
              if (newVsAI) { setIsFree(true); setStake("0"); }
            }}
            className={`w-10 h-6 rounded-full flex items-center px-0.5 ${vsAI ? "bg-blue-600 justify-end" : "bg-gray-700 justify-start"}`}
          >
            <div className="w-5 h-5 bg-white rounded-full" />
          </button>
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={!address || isPending || isConfirming}
          className="w-full bg-blue-600 disabled:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : `Start Match${!isFree ? ` (${stake} CELO)` : " (free)"}`}
        </button>
      </div>

      <p className="text-sm font-medium text-gray-400 mb-2.5">Open matches</p>
      <div className="flex flex-col gap-2">
        {!openRoomIds || openRoomIds.length === 0 ? (
          <p className="text-xs text-gray-600">No open matches — create one above.</p>
        ) : (
          openRoomIds.map((id) => <RoomCard key={id.toString()} roomId={id} />)
        )}
      </div>
    </main>
  );
}

function RoomCard({ roomId }: { roomId: bigint }) {
  const { address } = useAccount();
  const router = useRouter();
  const { writeContract, data: joinTxHash, isPending } = useWriteContract();
  const { isSuccess: joinSuccess } = useWaitForTransactionReceipt({ hash: joinTxHash });

  const { data: room } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "getRoom",
    args: [roomId],
  });

  useEffect(() => {
    if (joinSuccess) router.push(`/quiz/room/${roomId}`);
  }, [joinSuccess, roomId, router]);

  if (!room) return null;
  const [host, gameType, maxPlayers, stakeAmount, vsAI] = room;
  if (gameType !== GAME_TYPE_QUIZ) return null; // only show quiz rooms here

  function handleJoin() {
    writeContract({
      address: ADDRESSES.GameRooms,
      abi: GAME_ROOMS_ABI,
      functionName: "joinRoom",
      args: [roomId],
      value: stakeAmount,
    });
  }

  const isHost = host.toLowerCase() === address?.toLowerCase();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex justify-between items-center">
      <div>
        <p className="text-sm font-medium">Match #{roomId.toString()}</p>
        <p className="text-xs text-gray-500">{formatEther(stakeAmount)} CELO stake {vsAI ? "· vs AI" : ""}</p>
      </div>
      <button
        onClick={isHost ? () => router.push(`/quiz/room/${roomId}`) : handleJoin}
        disabled={!address || isPending}
        className="bg-blue-600 disabled:bg-gray-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
      >
        {isHost ? "Enter" : "Join"}
      </button>
    </div>
  );
}
