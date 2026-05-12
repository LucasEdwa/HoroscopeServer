import { getUserForQuery } from '../../services/userService';
import { askOpenAI } from '../../services/openaiService';
import { formatChartForAI } from '../formatters/chartFormatters';
import { getDailyAstrologyInsights, getCurrentPlanetsAdvanced } from '../../services/astrologyInsightsService';

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

Birth CHART ANALYSIS:
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

birth CHART ANALYSIS:
${formatChartForAI(userData.chartPoints || [])}

CURRENT ASTROLOGICAL CONDITIONS:
${await getDailyAstrologyInsights()}
`;
  } catch (error) {
    console.error('Error building user context:', error);
    return '';
  }
}

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

export async function generateOracleQuestionSuggestions(email: string): Promise<string[]> {
  try {
    const userData = await getUserForQuery(email);
    if (!userData) {
      throw new Error('User data not found');
    }

    const userChart = formatChartForAI(userData.chartPoints || []);
    const currentPlanets = await getCurrentPlanetsAdvanced();

    const prompt = `
You are an expert astrologer helping users explore their destiny through oracle questions.

USER PROFILE:
- Name: ${userData.username}
- Birth: ${userData.birthdate} at ${userData.birthtime}
- Location: ${userData.birth_city}, ${userData.birth_country}

NATAL CHART:
${userChart}

CURRENT TRANSITS:
${currentPlanets}

Based on this person's birth chart and current transits, generate exactly 8 thought-provoking oracle questions they should ask. These questions should:
- Be specific to their chart placements and current life cycles
- Cover different life areas (love, career, health, personal growth, spirituality)
- Help them gain clarity on important decisions
- Invite deeper self-reflection
- Be phrased as questions the user would ask the oracle

Format your response as a numbered list (1-8) with ONLY the questions, nothing else. Each question on a new line starting with the number.

Example format:
1. How will my Jupiter return influence my career direction over the next year?
2. What does my Saturn return teach me about commitment?
...`;

    const response = await askOpenAI('You are an expert astrologer.', prompt);
    
    // Parse the response into an array of questions
    const questions = response
      .split('\n')
      .filter((line: string) => line.match(/^\d+\./))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter((q: string) => q.length > 0);

    return questions;
  } catch (error) {
    console.error('Error generating oracle question suggestions:', error);
    throw new Error('Unable to generate question suggestions at this time');
  }
}
