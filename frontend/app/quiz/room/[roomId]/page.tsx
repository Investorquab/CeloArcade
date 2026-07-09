"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, GAME_ROOMS_ABI } from "@/lib/contracts";
import { formatEther, zeroAddress } from "viem";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

export default function QuizRoom() {
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

  const [question, setQuestion] = useState<Question | null>(null);
  const [myAnswer, setMyAnswer] = useState<{ index: number; timeMs: number } | null>(null);
  const [aiAnswer, setAiAnswer] = useState<{ index: number; timeMs: number } | null>(null);
  const [result, setResult] = useState<"me" | "ai" | "opponent" | null>(null);
  const [reportStatus, setReportStatus] = useState<"idle" | "reporting" | "done" | "error">("idle");
  const startTime = useRef<number>(0);

  const isAIMatch = players?.includes(zeroAddress);

  useEffect(() => {
    fetch("/api/generate-question?category=celo")
      .then((res) => res.json())
      .then((q) => {
        setQuestion(q);
        startTime.current = Date.now();
      });
  }, []);

  // AI answers after a random delay, with ~70% chance of being correct
  useEffect(() => {
    if (!question || !isAIMatch || aiAnswer) return;
    const delay = 1500 + Math.random() * 4000;
    const timer = setTimeout(() => {
      const correct = Math.random() < 0.7;
      const index = correct
        ? question.correctIndex
        : (question.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4;
      setAiAnswer({ index, timeMs: delay });
    }, delay);
    return () => clearTimeout(timer);
  }, [question, isAIMatch, aiAnswer]);

  // Decide the winner once both sides have answered (or AI answered first)
  useEffect(() => {
    if (!question || !myAnswer || result) return;
    if (isAIMatch && !aiAnswer) return; // wait for AI

    const meCorrect = myAnswer.index === question.correctIndex;
    const aiCorrect = aiAnswer ? aiAnswer.index === question.correctIndex : false;

    if (meCorrect && !aiCorrect) setResult("me");
    else if (!meCorrect && aiCorrect) setResult("ai");
    else if (meCorrect && aiCorrect) setResult(myAnswer.timeMs <= (aiAnswer?.timeMs ?? Infinity) ? "me" : "ai");
    else setResult(myAnswer.timeMs <= (aiAnswer?.timeMs ?? Infinity) ? "me" : "ai"); // both wrong — faster still "wins" for now
  }, [question, myAnswer, aiAnswer, isAIMatch, result]);

  // Report a real win onchain
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

  if (!room || !players || !question) {
    return <main className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading question...</main>;
  }

  const [, , , , , , pot] = room;

  return (
    <main className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <button onClick={() => router.push("/quiz")} className="text-sm text-gray-400 mb-4">
        ← Back to lobby
      </button>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Match #{roomId.toString()}</p>
        <p className="text-sm font-medium text-green-400">Pot: {formatEther(pot)} CELO</p>
      </div>

      {result ? (
        <div className={`rounded-xl p-5 text-center ${result === "me" ? "bg-green-950 border border-green-800" : "bg-red-950 border border-red-800"}`}>
          <p className="text-lg font-medium mb-2">
            {result === "me" ? "🎉 You won!" : "You lost this round"}
          </p>
          <p className="text-xs text-gray-400">
            Correct answer: {question.options[question.correctIndex]}
          </p>
          {result === "me" && (
            <p className="text-xs text-gray-400 mt-2">
              {reportStatus === "reporting" && "Reporting result onchain..."}
              {reportStatus === "done" && "✅ Payout sent onchain"}
              {reportStatus === "error" && "⚠️ Failed to report — contact support"}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium mb-4">{question.question}</p>
          <div className="flex flex-col gap-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!myAnswer}
                className={`text-left text-sm px-4 py-2.5 rounded-lg border ${
                  myAnswer?.index === i ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-200"
                } disabled:opacity-60`}
              >
                {opt}
              </button>
            ))}
          </div>
          {myAnswer && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              Answer locked in — waiting for opponent...
            </p>
          )}
        </div>
      )}
    </main>
  );
}
