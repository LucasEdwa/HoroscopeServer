import { askOpenAI } from './openaiService';
import { buildUserContext } from '../utils/ChatOi';
import { getDailyAstrologyInsights } from './astrologyInsightsService';

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
2. LOVE & RELATIONSHIPS
3. CAREER & PRODUCTIVITY
4. HEALTH & WELLNESS
5. SPIRITUAL & PERSONAL GROWTH
6. TIMING RECOMMENDATIONS
7. MOON PHASE INFLUENCE

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
2. SIGN-BY-SIGN FORECAST
3. UNIVERSAL THEMES
4. PRACTICAL COSMIC TIPS
5. WEEKEND/WEEK AHEAD PREVIEW

Make it informative, engaging, and practical for everyday life. Write in a friendly, accessible tone that makes astrology relatable and useful.
`;

    return askOpenAI('You are a cosmic news anchor and master astrologer delivering daily astrological insights.', prompt);
  } catch (error) {
    console.error('Error generating daily news:', error);
    throw new Error('Unable to provide cosmic news at this time');
  }
}
