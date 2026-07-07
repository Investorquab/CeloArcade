import { NextRequest, NextResponse } from "next/server";

// This route receives a claim request from the frontend, and should forward
// it to your bot service (the one holding OPERATOR_PRIVATE_KEY), which then
// calls BotFaucet.dispense(address) onchain.
//
// IMPORTANT: This is currently a STUB. It does not yet call the real bot.
// Wire this up once the bot service exists — either:
//   (a) call the bot service's own API endpoint from here, or
//   (b) have this route directly sign with OPERATOR_PRIVATE_KEY using ethers
//       (only do this if OPERATOR_PRIVATE_KEY is kept server-side only,
//        e.g. as a Vercel environment variable — NEVER exposed to the client)

export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  // TODO: replace this with an actual call to your bot service
  console.log(`[STUB] Would dispense faucet funds to: ${address}`);

  return NextResponse.json({
    success: true,
    message: "Stub response — bot service not yet wired up.",
  });
}
