"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI } from "@/lib/contracts";
import { formatEther, zeroAddress } from "viem";
import {
  GameState,
  initGame,
  movableTokens,
  applyMove,
  pickAIMove,
  rollDice,
  FINISHED,
} from "@/lib/ludoEngine";
import { LudoBoard } from "./LudoBoard";

const SEAT_COLORS = ["text-red-400", "text-blue-400", "text-yellow-400", "text-green-400"];
const SEAT_BG = ["bg-red-950", "bg-blue-950", "bg-yellow-950", "bg-green-950"];

export default function LudoRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = BigInt(params.roomId as string);
  const { address } = useAccount();

  const { data: room } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "getRoom",
    args: [roomId],
  });

  const { data: players } = useReadContract({
    address: ADDRESSES.GameRooms,
    abi: GAME_ROOMS_ABI,
    functionName: "getRoomPlayers",
    args: [roomId],
  });

  const [game, setGame] = useState<GameState | null>(null);
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "reporting" | "done" | "error">("idle");

  const totalSeats = players?.length ?? 0;
  const mySeat = players?.findIndex((p) => p.toLowerCase() === address?.toLowerCase()) ?? -1;

  // Initialize the game once we know how many seats there are
  useEffect(() => {
    if (totalSeats > 0 && !game) {
      setGame(initGame(totalSeats));
    }
  }, [totalSeats, game]);

  // Report the winner to the contract once a REAL player wins (not an AI seat)
  useEffect(() => {
    if (!game || game.winner === null || !players) return;
    const winnerAddress = players[game.winner];
    if (winnerAddress === zeroAddress) return; // AI won — see note below, no payout path exists yet
    if (reportStatus !== "idle") return;

    setReportStatus("reporting");
    fetch("/api/report-winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: roomId.toString(), winner: winnerAddress }),
    })
      .then((res) => (res.ok ? setReportStatus("done") : setReportStatus("error")))
      .catch(() => setReportStatus("error"));
  }, [game, players, roomId, reportStatus]);

  // AI auto-plays its turn
  useEffect(() => {
    if (!game || game.winner !== null || !players) return;
    const currentPlayer = players[game.turn];
    if (currentPlayer !== zeroAddress) return; // not an AI seat, do nothing here

    const timer = setTimeout(() => {
      const d = rollDice();
      setDice(d);

      // Three sixes in a row forfeits the ENTIRE turn — no move happens at all
      if (d === 6 && game.consecutiveSixes >= 2) {
        setGame({ ...game, turn: (game.turn + 1) % totalSeats, consecutiveSixes: 0 });
        return;
      }

      const tokenIndex = pickAIMove(game, game.turn, d, totalSeats);
      if (tokenIndex === -1) {
        setGame({
          ...game,
          turn: (game.turn + 1) % totalSeats,
          consecutiveSixes: d === 6 ? game.consecutiveSixes + 1 : 0,
        });
        return;
      }

      const { state: next, captured } = applyMove(game, game.turn, tokenIndex, d, totalSeats);
      const bonusTurn = (d === 6 || captured) && next.winner === null;
      setGame({
        ...next,
        turn: bonusTurn ? next.turn : (next.turn + 1) % totalSeats,
        consecutiveSixes: d === 6 ? game.consecutiveSixes + 1 : 0,
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [game, players, totalSeats]);

  function handleRoll() {
    if (!game || mySeat !== game.turn) return;
    setRolling(true);
    setTimeout(() => {
      const d = rollDice();
      setDice(d);

      // Three sixes in a row forfeits the ENTIRE turn — no move happens at all
      if (d === 6 && game.consecutiveSixes >= 2) {
        setGame({ ...game, turn: (game.turn + 1) % totalSeats, consecutiveSixes: 0 });
        setRolling(false);
        return;
      }

      const movable = movableTokens(game, mySeat, d);

      if (movable.length === 0) {
        setGame({
          ...game,
          turn: (game.turn + 1) % totalSeats,
          consecutiveSixes: d === 6 ? game.consecutiveSixes + 1 : 0,
        });
      } else if (movable.length === 1) {
        applyAndAdvance(movable[0], d);
      }
      // if movable.length > 1, wait for the player to pick via the token buttons
      setRolling(false);
    }, 500);
  }

  function applyAndAdvance(tokenIndex: number, d: number) {
    if (!game) return;
    const { state: next, captured } = applyMove(game, mySeat, tokenIndex, d, totalSeats);
    const bonusTurn = (d === 6 || captured) && next.winner === null;
    setGame({
      ...next,
      turn: bonusTurn ? next.turn : (next.turn + 1) % totalSeats,
      consecutiveSixes: d === 6 ? game.consecutiveSixes + 1 : 0,
    });
  }

  if (!room || !players || !game) {
    return <main className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading room...</main>;
  }

  const [, , , stakeAmount, , status, pot, contractWinner] = room;
  const isMyTurn = mySeat === game.turn && game.winner === null;
  const pendingChoice = dice !== null && mySeat === game.turn && game.winner === null
    ? movableTokens(game, mySeat, dice).length > 1
      ? movableTokens(game, mySeat, dice)
      : null
    : null;

  return (
    <main className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <button onClick={() => router.push("/ludo")} className="text-sm text-gray-400 mb-4">
        ← Back to lobby
      </button>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Room #{roomId.toString()}</p>
        <p className="text-sm font-medium text-green-400">Pot: {formatEther(pot)} CELO</p>
      </div>

      {game.winner !== null && (
        <div className="bg-green-950 border border-green-800 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm font-medium text-green-400">
            {players[game.winner] === zeroAddress
              ? "AI wins this round"
              : players[game.winner].toLowerCase() === address?.toLowerCase()
              ? "🎉 You won!"
              : `${players[game.winner].slice(0, 6)}.. won`}
          </p>
          {players[game.winner] !== zeroAddress && (
            <p className="text-xs text-gray-400 mt-1">
              {reportStatus === "reporting" && "Reporting result onchain..."}
              {reportStatus === "done" && "✅ Payout sent onchain"}
              {reportStatus === "error" && "⚠️ Failed to report — contact support"}
            </p>
          )}
        </div>
      )}

      <div className="mb-4">
        <LudoBoard tokens={game.tokens} totalSeats={totalSeats} />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {players.map((p, seat) => (
          <div
            key={seat}
            className={`rounded-xl p-3 border ${
              game.turn === seat && game.winner === null
                ? "border-white/40"
                : "border-gray-800"
            } ${SEAT_BG[seat % 4]}`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <p className={`text-xs font-medium ${SEAT_COLORS[seat % 4]}`}>
                {p === zeroAddress ? "🤖 AI" : p.toLowerCase() === address?.toLowerCase() ? "You" : `${p.slice(0, 6)}..`}
              </p>
              {game.turn === seat && game.winner === null && (
                <span className="text-[10px] text-gray-400">
                  {seat === mySeat ? "Your turn" : "Their turn"}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {game.tokens[seat].map((pos, i) => (
                <span key={i} className="text-[10px] bg-black/30 rounded px-1.5 py-0.5">
                  {pos === 0 ? "Yard" : pos === FINISHED ? "🏁" : pos <= 51 ? `${pos}` : `H${pos - 51}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {game.winner === null && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          {dice !== null && (
            <p className="text-3xl mb-3">🎲 {dice}</p>
          )}

          {pendingChoice ? (
            <>
              <p className="text-xs text-gray-400 mb-2">Choose a token to move:</p>
              <div className="flex gap-2 justify-center">
                {pendingChoice.map((tokenIndex) => (
                  <button
                    key={tokenIndex}
                    onClick={() => applyAndAdvance(tokenIndex, dice!)}
                    className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  >
                    Token {tokenIndex + 1}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              onClick={handleRoll}
              disabled={!isMyTurn || rolling}
              className="bg-blue-600 disabled:bg-gray-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg"
            >
              {rolling ? "Rolling..." : isMyTurn ? "Roll dice" : "Waiting for turn..."}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
