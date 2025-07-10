import { DailyHoroscopeModel } from '../models/DailyNews';
import { buildUserContext } from '../utils/ChatOi';
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

Based on this user's birth chart and current planetary positions, provide personalized daily advice for the entire week.

Please respond ONLY with a JSON object in this exact format:
{
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

Each advice should be 2-3 sentences focusing on:
- How the current planetary positions affect their personal chart
- Specific guidance for love, career, health, or finances
- Practical actions they can take that day

Make it personal and specific to their birth chart placements.
`;

    const response = await askOpenAI(
      'You are a master astrologer providing personalized daily advice based on natal charts and current planetary transits. Respond only with valid JSON.',
      prompt
    );

    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing ChatOI response:', error);
     
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

    for (let i = 0; i < weekdays.length; i++) {
      const weekday = weekdays[i];
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(weekStartDate.getDate() + i);

      const dailyHoroscope = {
        weekday: weekday as any,
        date: currentDate,
        zodiacSign: zodiacSign,
        title: `Personal Guidance - ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`,
        prediction: weeklyAdvice.weekdays[weekday] || "The stars guide you today.",
        mood: 'good' as any,
        energy: 'medium' as any,
        isPublished: true
      };

      try {
        await DailyHoroscopeModel.addDailyHoroscope(dailyHoroscope);
      } catch (error) {
        console.error(`Error saving ${weekday} horoscope:`, error);
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
      
      const dailyHoroscopes = await DailyHoroscopeModel.getDailyHoroscopesByWeek(zodiacSign, weekStartString);
      
      if (dailyHoroscopes.length === 0) {
        return null;
      }

      // Format response
      const weekdays: any = {};
      dailyHoroscopes.forEach((horoscope: any) => {
        weekdays[horoscope.weekday] = {
          date: horoscope.date,
          advice: horoscope.prediction,
          mood: horoscope.mood,
          energy: horoscope.energy
        };
      });

      return {
        weekStartDate,
        zodiacSign,
        weekdays
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
