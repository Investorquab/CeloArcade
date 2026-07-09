"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI } from "@/lib/contracts";
import { formatEther, zeroAddress } from "viem";

interface MathProblem {
  question: string;
  options: number[];
  correctIndex: number;
}

function generateProblem(): MathProblem {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 40) + 1;
  let b = Math.floor(Math.random() * 20) + 1;
  if (op === "-" && b > a) [a, b] = [b, a]; // keep subtraction non-negative

  let answer: number;
  if (op === "+") answer = a + b;
  else if (op === "-") answer = a - b;
  else answer = a * b;

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    if (offset !== 0) options.add(answer + offset);
  }
  const shuffled = Array.from(options).sort(() => Math.random() - 0.5);

  return {
    question: `${a} ${op} ${b} = ?`,
    options: shuffled,
    correctIndex: shuffled.indexOf(answer),
  };
}

export default function MathRoom() {
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

  const [problem] = useState<MathProblem>(() => generateProblem());
  const [myAnswer, setMyAnswer] = useState<{ index: number; timeMs: number } | null>(null);
  const [aiAnswer, setAiAnswer] = useState<{ index: number; timeMs: number } | null>(null);
  const [result, setResult] = useState<"me" | "ai" | null>(null);
  const [reportStatus, setReportStatus] = useState<"idle" | "reporting" | "done" | "error">("idle");
  const startTime = useRef<number>(Date.now());

  const isAIMatch = players?.includes(zeroAddress);

  useEffect(() => {
    if (!isAIMatch || aiAnswer) return;
    const delay = 1200 + Math.random() * 3500;
    const timer = setTimeout(() => {
      const correct = Math.random() < 0.65;
      const index = correct
        ? problem.correctIndex
        : (problem.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4;
      setAiAnswer({ index, timeMs: delay });
    }, delay);
    return () => clearTimeout(timer);
  }, [problem, isAIMatch, aiAnswer]);

  useEffect(() => {
    if (!myAnswer || result) return;
    if (isAIMatch && !aiAnswer) return;

    const meCorrect = myAnswer.index === problem.correctIndex;
    const aiCorrect = aiAnswer ? aiAnswer.index === problem.correctIndex : false;

    if (meCorrect && !aiCorrect) setResult("me");
    else if (!meCorrect && aiCorrect) setResult("ai");
    else setResult(myAnswer.timeMs <= (aiAnswer?.timeMs ?? Infinity) ? "me" : "ai");
  }, [myAnswer, aiAnswer, isAIMatch, result, problem]);

  useEffect(() => {
    if (result !== "me" || !address || reportStatus !== "idle") return;
    setReportStatus("reporting");
    fetch("/api/report-winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: roomId.toString(), winner: address }),
    })
      .then((res) => (res.ok ? setReportStatus("done") : setReportStatus("error")))
      .catch(() => setReportStatus("error"));
  }, [result, address, roomId, reportStatus]);

  function handleAnswer(index: number) {
    if (myAnswer) return;
    setMyAnswer({ index, timeMs: Date.now() - startTime.current });
  }

  if (!room || !players) {
    return <main className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading...</main>;
  }

  const [, , , , , , pot] = room;

  return (
    <main className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <button onClick={() => router.push("/math")} className="text-sm text-gray-400 mb-4">
        ← Back to lobby
      </button>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Match #{roomId.toString()}</p>
        <p className="text-sm font-medium text-green-400">Pot: {formatEther(pot)} CELO</p>
      </div>

      {result ? (
        <div className={`rounded-xl p-5 text-center ${result === "me" ? "bg-green-950 border border-green-800" : "bg-red-950 border border-red-800"}`}>
          <p className="text-lg font-medium mb-2">{result === "me" ? "🎉 You won!" : "You lost this round"}</p>
          <p className="text-xs text-gray-400">Correct answer: {problem.options[problem.correctIndex]}</p>
          {result === "me" && (
            <p className="text-xs text-gray-400 mt-2">
              {reportStatus === "reporting" && "Reporting result onchain..."}
              {reportStatus === "done" && "✅ Payout sent onchain"}
              {reportStatus === "error" && "⚠️ Failed to report — contact support"}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <p className="text-2xl font-medium mb-5">{problem.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {problem.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!myAnswer}
                className={`text-sm px-4 py-3 rounded-lg border ${
                  myAnswer?.index === i ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-200"
                } disabled:opacity-60`}
              >
                {opt}
              </button>
            ))}
          </div>
          {myAnswer && <p className="text-xs text-gray-500 mt-3">Answer locked in — waiting...</p>}
        </div>
      )}
    </main>
  );
}
