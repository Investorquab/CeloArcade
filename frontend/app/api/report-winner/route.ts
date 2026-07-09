import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { ADDRESSES, GAME_ROOMS_ABI } from "@/lib/contracts";

// This route acts as your "bot" for now — it signs with OPERATOR_PRIVATE_KEY
// (kept server-side only, never sent to the browser) and calls reportWinner()
// on GameRooms. Later, this logic can move into a dedicated bot service instead
// of living inside a Next.js API route, but the contract call is identical.

export async function POST(req: NextRequest) {
  const { roomId, winner } = await req.json();

  if (roomId === undefined || !winner) {
    return NextResponse.json({ error: "Missing roomId or winner" }, { status: 400 });
  }

  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!operatorKey) {
    console.error("OPERATOR_PRIVATE_KEY is not set — cannot report winner");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const account = privateKeyToAccount(operatorKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(process.env.CELO_RPC_URL || "https://forno.celo.org"),
    });

    const publicClient = createPublicClient({
      chain: celo,
      transport: http(process.env.CELO_RPC_URL || "https://forno.celo.org"),
    });

    const hash = await walletClient.writeContract({
      address: ADDRESSES.GameRooms,
      abi: GAME_ROOMS_ABI,
      functionName: "reportWinner",
      args: [BigInt(roomId), winner],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (error: any) {
    console.error("Failed to report winner:", error);
    return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
  }
}
