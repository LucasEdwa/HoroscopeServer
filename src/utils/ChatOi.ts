import axios from 'axios';
import swisseph from 'swisseph';
import { getUserForQuery } from '../services/userService';
import {  getAllPlanets, dateToJulian, longitudeToSign } from '../hooks/swissephHook';

// Types
interface OpenAIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

interface ChartPoint {
  name: string;
  longitude?: number;
  latitude?: number;
  sign: string;
  house?: number;
  degree: number;
  minute: number;
  second?: number;
  planet_type: string;
}

interface PlanetPosition {
  name: string;
  id: number;
}

// Constants
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_CONFIG: OpenAIConfig = {
  model: 'gpt-3.5-turbo',
  maxTokens: 800,
  temperature: 0.8
};

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

const PLANETS: PlanetPosition[] = [
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

// Core OpenAI function
async function askOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: OPENAI_CONFIG.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    return response.data.choices[0]?.message?.content?.trim() || 'No response received';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to get AI response');
  }
}

export async function askOracle(question: string, chart: any, email?: string): Promise<string> {
  let userContext = '';
  
  // If email is provided, fetch complete user data for better predictions
  if (email) {
    try {
      const userData = await getUserForQuery(email);
      if (userData) {
        userContext = `
COMPLETE USER PROFILE:
- Name: ${userData.username}
- Birth Date: ${userData.birthdate}
- Birth Time: ${userData.birthtime}
- Birth Location: ${userData.birth_city}, ${userData.birth_country}

NATAL CHART ANALYSIS:
${formatChartForAI(userData.chartPoints)}

CURRENT ASTROLOGICAL CONDITIONS:
${await getDailyAstrologyInsights()}
`;
      }
    } catch (error) {
      console.error('Error fetching user data for oracle:', error);
    }
  }

  // Compose a comprehensive prompt with all available data
  const prompt = `
You are an expert astrology oracle with deep knowledge of charts, planetary transits, and predictive astrology.

${userContext || `Here is the user's astral chart: ${JSON.stringify(chart, null, 2)}`}

The user asks: "${question}"

Based on ALL available astrological data, provide a detailed, personalized prediction about the user's future. Consider:
1. User's chart placements and their meanings
2. Current planetary transits affecting the user
3. Upcoming significant astrological events
4. How the user's birth chart interacts with current cosmic energies
5. Specific timing for events or opportunities
6. Practical advice for navigating the predicted influences

Give a thoughtful, comprehensive astrological analysis that feels personal and actionable.
`;
  
  return askOpenAI('You are an expert astrology oracle and predictive astrologer.', prompt);
}

// Helper functions
function formatChartForAI(chartPoints: ChartPoint[]): string {
  if (!chartPoints || chartPoints.length === 0) {
    return 'No chart data available.';
  }

  let formatted = '';
  
  // Group by planet type for better organization
  const planets = chartPoints.filter(p => p.planet_type === 'planet');
  const houses = chartPoints.filter(p => p.planet_type === 'house');
  const aspects = chartPoints.filter(p => p.planet_type === 'aspect');

  if (planets.length > 0) {
    formatted += 'PLANETARY POSITIONS:\n';
    planets.forEach(planet => {
      formatted += `- ${planet.name}: ${planet.sign} ${planet.degree}°${planet.minute}' (House ${planet.house || 'N/A'})\n`;
    });
    formatted += '\n';
  }

  if (houses.length > 0) {
    formatted += 'HOUSE CUSPS:\n';
    houses.forEach(house => {
      formatted += `- ${house.name}: ${house.sign} ${house.degree}°${house.minute}'\n`;
    });
    formatted += '\n';
  }

  if (aspects.length > 0) {
    formatted += 'MAJOR ASPECTS:\n';
    aspects.forEach(aspect => {
      formatted += `- ${aspect.name}\n`;
    });
  }

  return formatted;
}

// Enhanced helper functions using Swiss Ephemeris
async function getCurrentPlanetsAdvanced(): Promise<string> {
  try {
    const now = new Date();
    const julianDay = dateToJulian(now);
    const planets = getAllPlanets(julianDay);

    let formatted = 'CURRENT PLANETARY POSITIONS:\n';
    
    Object.entries(planets).forEach(([planetName, position]) => {
      const name = planetName.charAt(0).toUpperCase() + planetName.slice(1);
      formatted += `- ${name}: ${position.sign} ${position.degree}°${position.minute}'\n`;
    });

    return formatted;
  } catch (error) {
    console.error('Error getting advanced planetary positions:', error);
    return 'Current planetary positions unavailable';
  }
}

async function getAstrologicalAspects(): Promise<string> {
  try {
    const now = new Date();
    const julianDay = dateToJulian(now);
    const planets = getAllPlanets(julianDay);
    
    let aspects = 'MAJOR CURRENT ASPECTS:\n';
    
    // Calculate major aspects between planets
    const planetList = Object.entries(planets);
    
    for (let i = 0; i < planetList.length; i++) {
      for (let j = i + 1; j < planetList.length; j++) {
        const [planet1Name, planet1] = planetList[i];
        const [planet2Name, planet2] = planetList[j];
        
        const angle = Math.abs(planet1.longitude - planet2.longitude);
        const normalizedAngle = angle > 180 ? 360 - angle : angle;
        
        // Check for major aspects (allowing 5-degree orb)
        const aspectName = getAspectName(normalizedAngle);
        if (aspectName) {
          aspects += `- ${planet1Name.charAt(0).toUpperCase() + planet1Name.slice(1)} ${aspectName} ${planet2Name.charAt(0).toUpperCase() + planet2Name.slice(1)}\n`;
        }
      }
    }
    
    return aspects;
  } catch (error) {
    console.error('Error calculating aspects:', error);
    return 'Astrological aspects unavailable';
  }
}

function getAspectName(angle: number): string | null {
  const aspects = [
    { name: 'Conjunction', angle: 0, orb: 8 },
    { name: 'Sextile', angle: 60, orb: 6 },
    { name: 'Square', angle: 90, orb: 8 },
    { name: 'Trine', angle: 120, orb: 8 },
    { name: 'Opposition', angle: 180, orb: 8 }
  ];
  
  for (const aspect of aspects) {
    if (Math.abs(angle - aspect.angle) <= aspect.orb) {
      return aspect.name;
    }
  }
  
  return null;
}

async function getDailyAstrologyInsights(): Promise<string> {
  try {
    const planets = await getCurrentPlanetsAdvanced();
    const aspects = await getAstrologicalAspects();
    const now = new Date();
    const julianDay = dateToJulian(now);
    
    // Get moon phase
    const moonPosition = getAllPlanets(julianDay).moon;
    const sunPosition = getAllPlanets(julianDay).sun;
    const moonPhase = getMoonPhase(moonPosition.longitude, sunPosition.longitude);
    
    return `
${planets}

${aspects}

LUNAR INFORMATION:
- Moon Phase: ${moonPhase}
- Moon Sign: ${moonPosition.sign} ${moonPosition.degree}°${moonPosition.minute}'

DATE: ${now.toDateString()}
`;
  } catch (error) {
    console.error('Error getting daily astrology insights:', error);
    return 'Daily astrological insights unavailable';
  }
}

function getMoonPhase(moonLongitude: number, sunLongitude: number): string {
  const angleDiff = ((moonLongitude - sunLongitude + 360) % 360);
  
  if (angleDiff < 45) return 'New Moon';
  if (angleDiff < 90) return 'Waxing Crescent';
  if (angleDiff < 135) return 'First Quarter';
  if (angleDiff < 180) return 'Waxing Gibbous';
  if (angleDiff < 225) return 'Full Moon';
  if (angleDiff < 270) return 'Waning Gibbous';
  if (angleDiff < 315) return 'Last Quarter';
  return 'Waning Crescent';
}

export async function buildUserContext(email: string): Promise<string> {
  try {
    const userData = await getUserForQuery(email);
    if (!userData) {
      return '';
    }

    return `
COMPLETE USER PROFILE:
- Name: ${userData.username || 'Not provided'}
- Birth Date: ${userData.birthdate || 'Not provided'}
- Birth Time: ${userData.birthtime || 'Not provided'}
- Birth Location: ${userData.birth_city || 'Not provided'}, ${userData.birth_country || 'Not provided'}

NATAL CHART ANALYSIS:
${formatChartForAI(userData.chartPoints || [])}

CURRENT ASTROLOGICAL CONDITIONS:
${await getDailyAstrologyInsights()}
`;
  } catch (error) {
    console.error('Error building user context:', error);
    return '';
  }
}

// Enhanced function for comprehensive future predictions
export async function askComprehensiveFuture(email: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<string> {
  try {
    const userData = await getUserForQuery(email);
    if (!userData) {
      throw new Error('User data not found');
    }

    const currentPlanets = await getCurrentPlanetsAdvanced();
    const userChart = formatChartForAI(userData.chartPoints || []);

    const prompt = `
You are a master astrologer specializing in predictive astrology and life timing.

USER PROFILE:
- Name: ${userData.username}
- Birth: ${userData.birthdate} at ${userData.birthtime}
- Location: ${userData.birth_city}, ${userData.birth_country}

NATAL CHART:
${userChart}

CURRENT TRANSITS:
${currentPlanets}

Provide a comprehensive ${timeframe}ly forecast covering:

1. LOVE & RELATIONSHIPS
   - Romantic opportunities and challenges
   - Relationship timing and compatibility insights
   - Family and friendship dynamics

2. CAREER & FINANCES
   - Professional opportunities and obstacles
   - Best timing for career moves
   - Financial trends and investment advice

3. HEALTH & WELLNESS
   - Physical and mental health trends
   - Best practices for maintaining balance
   - Energy levels and vitality cycles

4. PERSONAL GROWTH
   - Spiritual development opportunities
   - Learning and skill development
   - Major life themes and lessons

5. TIMING RECOMMENDATIONS
   - Lucky dates and periods
   - Times to avoid major decisions
   - Optimal timing for new beginnings

Provide specific dates, practical advice, and actionable insights based on the astrological influences.
`;

    return askOpenAI('You are a master predictive astrologer with expertise in life timing and comprehensive forecasting.', prompt);
  } catch (error) {
    console.error('Error generating comprehensive future prediction:', error);
    throw new Error('Unable to generate prediction at this time');
  }
}

export async function askDailyAstroAdvice(chart: any, email?: string): Promise<string> {
  try {
    let userContext = '';
    let dailyInsights = '';

    if (email) {
      userContext = await buildUserContext(email);
    } else {
      dailyInsights = await getDailyAstrologyInsights();
    }

    const prompt = `
You are an expert astrology oracle providing comprehensive daily guidance.

${userContext || `Here is the user's astral chart: ${JSON.stringify(chart, null, 2)}`}

${!userContext ? `CURRENT ASTROLOGICAL CONDITIONS:\n${dailyInsights}` : ''}

Based on these astrological conditions, provide a detailed daily forecast that includes:

1. GENERAL ENERGY & MOOD
   - Overall cosmic energy for the day
   - Emotional themes and mental clarity
   - Best times for different activities

2. LOVE & RELATIONSHIPS
   - Romantic energy and communication
   - Family and friendship dynamics
   - Social opportunities and challenges

3. CAREER & PRODUCTIVITY
   - Work energy and focus levels
   - Best times for important meetings or decisions
   - Creative and professional opportunities

4. HEALTH & WELLNESS
   - Physical energy levels
   - Mental and emotional well-being
   - Recommended self-care practices

5. SPIRITUAL & PERSONAL GROWTH
   - Meditation and reflection opportunities
   - Learning and insight potential
   - Intuitive and psychic sensitivity

6. TIMING RECOMMENDATIONS
   - Most favorable hours of the day
   - Activities to embrace or avoid
   - Lucky colors, numbers, or directions

7. MOON PHASE INFLUENCE
   - How the current moon phase affects your energy
   - Manifestation and release opportunities
   - Emotional and intuitive guidance

Provide practical, actionable advice that helps navigate today's cosmic energies with wisdom and awareness.
`;
    
    return askOpenAI('You are a master astrologer providing daily cosmic guidance.', prompt);
  } catch (error) {
    console.error('Error generating daily astro advice:', error);
    throw new Error('Unable to provide daily guidance at this time');
  }
}

export async function askDailyNews(email?: string): Promise<string> {
  try {
    const dailyInsights = await getDailyAstrologyInsights();
    let userContext = '';

    if (email) {
      userContext = await buildUserContext(email);
    }

    const prompt = `
You are a cosmic news anchor delivering the daily astrological weather report.

${userContext}

TODAY'S COSMIC CONDITIONS:
${dailyInsights}

Create an engaging daily astrological news report covering:

1. COSMIC HEADLINES
   - Major planetary movements and their global impact
   - Significant astrological events happening today
   - Energy shifts and cosmic themes

2. SIGN-BY-SIGN FORECAST
   - Brief guidance for each zodiac sign
   - Key opportunities and challenges
   - Lucky elements for each sign

3. UNIVERSAL THEMES
   - Collective energy and social dynamics
   - Global trends and consciousness shifts
   - Spiritual and metaphysical insights

4. PRACTICAL COSMIC TIPS
   - Best times for important activities
   - Colors, crystals, and rituals for the day
   - Meditation and manifestation guidance

5. WEEKEND/WEEK AHEAD PREVIEW
   - Upcoming astrological events
   - Energy trends to prepare for
   - Long-term cosmic patterns

Make it informative, engaging, and practical for everyday life. Write in a friendly, accessible tone that makes astrology relatable and useful.
`;

    return askOpenAI('You are a cosmic news anchor and master astrologer delivering daily astrological insights.', prompt);
  } catch (error) {
    console.error('Error generating daily news:', error);
    throw new Error('Unable to provide cosmic news at this time');
  }
}