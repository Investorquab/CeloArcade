"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI } from "@/lib/contracts";
import { parseEther, formatEther } from "viem";
import { useRouter } from "next/navigation";

const GAME_TYPE_LUDO = 0;

export default function LudoLobby() {
  const { address } = useAccount();
  const router = useRouter();

  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(2);
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
    query: {
      refetchInterval: 5000, // also refresh every 5s so joined-room activity shows up
    },
  });

  // Re-fetch the open rooms list the moment our create-room tx confirms
  useEffect(() => {
    if (isSuccess) {
      refetchOpenRooms();
    }
  }, [isSuccess, refetchOpenRooms]);

  function handleCreateRoom() {
    if (!address) return;
    const stakeWei = parseEther(stake || "0");

    writeContract({
      address: ADDRESSES.GameRooms,
      abi: GAME_ROOMS_ABI,
      functionName: "createRoom",
      args: [GAME_TYPE_LUDO, maxPlayers, stakeWei, vsAI],
      value: stakeWei,
    });
  }

  return (
    <main className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <button onClick={() => router.push("/hub")} className="text-sm text-gray-400 mb-4">
        ← Back to hub
      </button>

      <h1 className="text-xl font-medium mb-1">Ludo</h1>
      <p className="text-sm text-gray-500 mb-6">Create a room or join an open one</p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <p className="text-sm font-medium mb-3">Create a room</p>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1.5">Players</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMaxPlayers(2)}
              className={`flex-1 py-2 rounded-lg text-sm ${
                maxPlayers === 2 ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              2 Players
            </button>
            <button
              onClick={() => setMaxPlayers(4)}
              className={`flex-1 py-2 rounded-lg text-sm ${
                maxPlayers === 4 ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              4 Players
            </button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1.5">Mode</p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setIsFree(true); setStake("0"); }}
              className={`flex-1 py-2 rounded-lg text-sm ${
                isFree ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              Play for free
            </button>
            <button
              onClick={() => { setIsFree(false); setStake("0.1"); }}
              className={`flex-1 py-2 rounded-lg text-sm ${
                !isFree ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              Stake CELO
            </button>
          </div>

          {!isFree && (
            <>
              <p className="text-xs text-gray-500 mb-1.5">Stake per player (CELO)</p>
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">Play vs AI (fills empty slots)</p>
          <button
            onClick={() => setVsAI(!vsAI)}
            className={`w-10 h-6 rounded-full flex items-center px-0.5 ${
              vsAI ? "bg-blue-600 justify-end" : "bg-gray-700 justify-start"
            }`}
          >
            <div className="w-5 h-5 bg-white rounded-full" />
          </button>
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={!address || isPending || isConfirming}
          className="w-full bg-blue-600 disabled:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Creating room..."
            : `Create Room${!isFree ? ` (stake ${stake} CELO)` : " (free)"}`}
        </button>

        {isSuccess && (
          <p className="text-xs text-green-400 mt-2">
            ✅ Room created! Tx: {txHash?.slice(0, 10)}...
          </p>
        )}
      </div>

      <p className="text-sm font-medium text-gray-400 mb-2.5">Open rooms</p>
      <div className="flex flex-col gap-2">
        {!openRoomIds || openRoomIds.length === 0 ? (
          <p className="text-xs text-gray-600">No open rooms right now — create one above.</p>
        ) : (
          openRoomIds.map((id) => <RoomCard key={id.toString()} roomId={id} />)
        )}
      </div>
    </main>
  );
}

function RoomCard({ roomId }: { roomId: bigint }) {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const { data: room } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "getRoom",
    args: [roomId],
  });

  if (!room) return null;

  const [host, gameType, maxPlayers, stakeAmount, vsAI] = room;

  function handleJoin() {
    writeContract({
      address: ADDRESSES.GameRooms,
      abi: GAME_ROOMS_ABI,
      functionName: "joinRoom",
      args: [roomId],
      value: stakeAmount,
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex justify-between items-center">
      <div>
        <p className="text-sm font-medium">Room #{roomId.toString()}</p>
        <p className="text-xs text-gray-500">
          {maxPlayers} players · {formatEther(stakeAmount)} CELO stake {vsAI ? "· vs AI" : ""}
        </p>
      </div>
      <button
        onClick={handleJoin}
        disabled={!address || isPending || host.toLowerCase() === address?.toLowerCase()}
        className="bg-blue-600 disabled:bg-gray-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
      >
        {host.toLowerCase() === address?.toLowerCase() ? "Your room" : "Join"}
      </button>
    </div>
  );
}
