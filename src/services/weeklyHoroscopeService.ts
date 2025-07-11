import { NewsDatabase } from '../models/DailyNews';
import { buildUserContext } from '../utils/ai/ChatOi';
import { askOpenAI } from './openaiService';
import { getCurrentPlanetsAdvanced } from './astrologyInsightsService';
import { getUserForQuery } from './userService';

export class WeeklyHoroscopeService {
  
  /**
   * Generate weekly horoscope for user using ChatOI
   */
  static async generateWeeklyHoroscopeForUser(email: string, weekStartDate: Date): Promise<any> {
    try {
      // Get user data and context
      const userData = await getUserForQuery(email);
      if (!userData) {
        throw new Error('User not found');
      }

      // Build complete user context (chart + current transits)
      const userContext = await buildUserContext(email);
      const currentPlanets = await getCurrentPlanetsAdvanced();
      
      // Calculate week end date
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);

      // Ask ChatOI for weekly advice in structured format
      const weeklyAdvice = await this.getWeeklyAdviceFromChatOI(
        userContext, 
        currentPlanets, 
        weekStartDate, 
        weekEndDate
      );

      // Save to database
      await this.saveWeeklyAdviceToDatabase(weeklyAdvice, userData, weekStartDate);

      return {
        success: true,
        weekStartDate,
        weekEndDate,
        advice: weeklyAdvice
      };

    } catch (error) {
      console.error('Error generating weekly horoscope:', error);
      throw error;
    }
  }

  /**
   * Ask ChatOI for structured weekly advice
   */
  private static async getWeeklyAdviceFromChatOI(
    userContext: string, 
    currentPlanets: string,
    weekStartDate: Date,
    weekEndDate: Date
  ): Promise<any> {
    
    const prompt = `
${userContext}

CURRENT ASTRONOMICAL POSITIONS:
${currentPlanets}

WEEK: ${weekStartDate.toLocaleDateString()} to ${weekEndDate.toLocaleDateString()}

Based on this user's birth chart and current planetary positions, provide:
1. A short, insightful weekly overview (2-4 sentences) summarizing the main astrological themes, opportunities, and challenges for the week.
2. Personalized daily advice for each day of the week based on the actual day of today, 7 days ahead.

Please respond ONLY with a JSON object in this exact format:
{
  "weeklyOverview": "short summary of the week's main astrological themes and advice",
  "weekdays": {
    "monday": "personalized advice for Monday based on chart and current planets",
    "tuesday": "personalized advice for Tuesday based on chart and current planets", 
    "wednesday": "personalized advice for Wednesday based on chart and current planets",
    "thursday": "personalized advice for Thursday based on chart and current planets",
    "friday": "personalized advice for Friday based on chart and current planets",
    "saturday": "personalized advice for Saturday based on chart and current planets",
    "sunday": "personalized advice for Sunday based on chart and current planets"
  }
}

Each daily advice should be 2-3 sentences focusing on:
- How the current planetary positions affect their personal chart
- Specific guidance for love, career, health, or finances
- Practical actions they can take that day

Make both the overview and daily advice personal and specific to their birth chart placements.
`;

    const response = await askOpenAI(
      'You are a master astrologer providing personalized daily advice based on natal charts and current planetary transits. Respond only with valid JSON.',
      prompt

    );


    try {
      // Remove code block markers if present
      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Error parsing ChatOI response:', error, 'Raw response:', response);
      return null;
    }
  }

  /**
   * Save weekly advice to database
   */
  private static async saveWeeklyAdviceToDatabase(
    weeklyAdvice: any, 
    userData: any, 
    weekStartDate: Date
  ): Promise<void> {
    
    if (!userData.birthdate) {
      throw new Error('User birth date is required');
    }
    
    const zodiacSign = this.getZodiacSignFromDate(new Date(userData.birthdate));
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const newsDb = new NewsDatabase();
    // Start from today, not Monday
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const jsDay = currentDate.getDay();
      const weekday = weekdays[jsDay === 0 ? 6 : jsDay - 1];
      // Use the real weekday name for each date as the key
      const realWeekday = weekdays[jsDay === 0 ? 6 : jsDay - 1];
      const dailyHoroscope = {
        weekday: realWeekday as any,
        date: currentDate,
        zodiacSign: zodiacSign,
        title: `Personal Guidance - ${realWeekday.charAt(0).toUpperCase() + realWeekday.slice(1)}`,
        prediction: weeklyAdvice.weekdays[realWeekday] || "The stars guide you today.",
        mood: 'good' as any,
        energy: 'medium' as any,
        isPublished: true,
        weeklyOverview: i === 0 ? weeklyAdvice.weeklyOverview : null // Only first day gets overview
      };
      try {
        await newsDb.addDailyNews(dailyHoroscope, userData.id);
      } catch (error) {
        console.error(`Error saving ${realWeekday} horoscope:`, error);
      }
    }
  }

  /**
   * Get user's weekly horoscope from database
   */
  static async getUserWeeklyHoroscope(email: string, weekStartDate: Date): Promise<any> {
    try {
      const userData = await getUserForQuery(email);
      if (!userData) {
        throw new Error('User not found');
      }

      if (!userData.birthdate) {
        throw new Error('User birth date is required');
      }

      const zodiacSign = this.getZodiacSignFromDate(new Date(userData.birthdate));
      const weekStartString = weekStartDate.toISOString().split('T')[0];
      
      const newsDb = new NewsDatabase();
      const userId = Number(userData.id);
      // Query all daily news for this user, sign, and week
      // Start from today, not Monday
      const weekdaysArr = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const today = new Date();
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        weekDates.push(d);
      }
      const weekDateStrings = weekDates.map(d => d.toISOString().split('T')[0]);
      // Fetch all daily news for the week
      const dailyHoroscopes = [];
      let weeklyOverview = '';
      const weekdays: any = {};
      for (let i = 0; i < weekDateStrings.length; i++) {
        const dateStr = weekDateStrings[i];
        const entry = await newsDb.getDailyNews(userId, zodiacSign, dateStr);
        if (entry) {
          dailyHoroscopes.push(entry);
          if (i === 0 && entry.weeklyOverview) {
            weeklyOverview = entry.weeklyOverview;
          }
          // Use the real weekday name for each date as the key
          const jsDay = weekDates[i].getDay();
          const realWeekday = weekdaysArr[jsDay === 0 ? 6 : jsDay - 1];
          weekdays[realWeekday] = {
            date: entry.date,
            advice: entry.prediction,
            mood: entry.mood,
            energy: entry.energy
          };
        }
      }
      if (dailyHoroscopes.length === 0) {
        return null;
      }
      return {
        weekStartDate: today,
        zodiacSign,
        weekdays,
        weeklyOverview
      };

    } catch (error) {
      console.error('Error getting user weekly horoscope:', error);
      throw error;
    }
  }

  /**
   * Determine zodiac sign from birth date
   */
  private static getZodiacSignFromDate(birthDate: Date): string {
    const month = birthDate.getMonth() + 1;
    const day = birthDate.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';
    
    return 'aries'; // fallback
  }

  /**
   * Get the start of the week (Monday) for any given date
   */
  static getWeekStartDate(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(result.setDate(diff));
  }
}
