import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function askOracle(question: string, chart: any): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not set');

  // Compose a prompt with the user's astral chart and question
  const prompt = `
You are an astrology oracle. Here is the user's astral chart:
${JSON.stringify(chart, null, 2)}

The user asks: "${question}"

Based on the chart, give a thoughtful, astrological answer about the user's future.
`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert astrology oracle.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.8
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content.trim();
}
