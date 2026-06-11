export default async function handler(req, res) {
  // Allow requests from your frontend only
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const cat = req.query.cat || 'General';
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured' });
  }

  const prompt = `Generate exactly 10 multiple choice trivia questions about the topic: "${cat}".

Rules:
- Each question must be fresh, interesting, and not repeated
- 4 answer options per question (index 0-3)
- Exactly one correct answer
- Mix easy, medium, and hard questions
- Keep questions concise (under 15 words)
- Keep answers short (1-4 words each)

Respond ONLY with a JSON array, no markdown, no explanation. Format:
[{"q":"Question text?","o":["Option A","Option B","Option C","Option D"],"a":2}]

Where "a" is the index (0-3) of the correct answer.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) throw new Error('Empty response from Groq');

    // Strip markdown fences if present
    const clean = text.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);

    // Validate structure
    if (!Array.isArray(questions) || questions.length < 5) {
      throw new Error('Invalid question format');
    }

    return res.status(200).json({ questions });
  } catch (e) {
    console.error('Groq error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}