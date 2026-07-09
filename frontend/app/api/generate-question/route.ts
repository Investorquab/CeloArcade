import { NextRequest, NextResponse } from "next/server";

const FALLBACK_QUESTIONS = [
  {
    question: "What is the native token of the Celo blockchain?",
    options: ["ETH", "CELO", "MATIC", "SOL"],
    correctIndex: 1,
  },
  {
    question: "Which continent has the most countries?",
    options: ["Asia", "Europe", "Africa", "South America"],
    correctIndex: 2,
  },
  {
    question: "What does 'HODL' commonly mean in crypto slang?",
    options: ["A trading strategy", "Hold On for Dear Life", "A type of wallet", "An exchange fee"],
    correctIndex: 1,
  },
  {
    question: "What is the capital of Nigeria?",
    options: ["Lagos", "Kano", "Abuja", "Ibadan"],
    correctIndex: 2,
  },
];

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "general";
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    const q = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
    return NextResponse.json(q);
  }

  try {
    const prompt =
      category === "celo"
        ? "Generate one multiple-choice trivia question about the Celo blockchain or crypto/Web3 in general."
        : "Generate one multiple-choice trivia question, general knowledge, not too obscure.";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              'You generate trivia questions. Respond with ONLY valid JSON, no markdown, no backticks, in this exact shape: {"question": "...", "options": ["...","...","...","..."], "correctIndex": 0}. correctIndex is the 0-based index of the correct option.',
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
      throw new Error("Malformed question from Groq");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Groq question generation failed, using fallback:", error);
    const q = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
    return NextResponse.json(q);
  }
}
