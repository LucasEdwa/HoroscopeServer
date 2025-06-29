import axios from 'axios';
import swisseph from 'swisseph'; 

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function askOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not set');
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
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

export async function askOracle(question: string, chart: any): Promise<string> {
  // Compose a prompt with the user's astral chart and question
  const prompt = `
You are an astrology oracle. Here is the user's astral chart:
${JSON.stringify(chart, null, 2)}

The user asks: "${question}"

Based on the chart, give a thoughtful, astrological answer about the user's future.
`;
  return askOpenAI('You are an expert astrology oracle.', prompt);
}

async function getCurrentPlanets(): Promise<string> {
  // Get current date
  const now = new Date();
  const jd = swisseph.swe_julday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600,
    swisseph.SE_GREG_CAL
  );

  // List of planet constants from Swiss Ephemeris
  const planets = [
    { name: 'Sun', id: swisseph.SE_SUN },
    { name: 'Moon', id: swisseph.SE_MOON },
    { name: 'Mercury', id: swisseph.SE_MERCURY },
    { name: 'Venus', id: swisseph.SE_VENUS },
    { name: 'Mars', id: swisseph.SE_MARS },
    { name: 'Jupiter', id: swisseph.SE_JUPITER },
    { name: 'Saturn', id: swisseph.SE_SATURN },
    { name: 'Uranus', id: swisseph.SE_URANUS },
    { name: 'Neptune', id: swisseph.SE_NEPTUNE },
    { name: 'Pluto', id: swisseph.SE_PLUTO }
  ];

  // Calculate positions
  let positions: string[] = [];
  for (const planet of planets) {
    const pos = await new Promise<number>((resolve, reject) => {
      swisseph.swe_calc_ut(jd, planet.id, 0, (res: any) => {
        if (res.error) reject(res.error);
        else resolve(res.longitude);
      });
    });
    // Convert longitude to zodiac sign and degree
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    const signIndex = Math.floor(pos / 30);
    const degree = (pos % 30).toFixed(2);
    positions.push(`${planet.name}: ${signs[signIndex]} ${degree}°`);
  }

  return positions.join('\n');
}

export async function askDailyAstroAdvice(chart:any): Promise<string> {
  const planets = await getCurrentPlanets();
  const prompt = `
You are an expert astrology oracle. Here is the user's astral chart:
    ${JSON.stringify(chart, null, 2)}
Here are the current planetary positions for today:
${planets}

Based on these positions, give a thoughtful daily analysis and practical advice for users. Mention what activities or attitudes are favored today, and what to be cautious about.
`;
  return askOpenAI('You are an expert astrology oracle.', prompt);
}