
import { WeeklyHoroscopeService } from '../../services/weeklyHoroscopeService';
import { IWeeklyHoroscope } from "../../interfaces/WeeklyNews";




export const weeklyHoroscopeResolvers = {
  Query: {
    /**
     * Fetch weekly horoscope for the authenticated user by email and weekStartDate
     */
    weeklyHoroscopeByUser: async (
      _: any,
      args: { email: string; weekStartDate: string }
    ): Promise<IWeeklyHoroscope | null> => {
      const { email, weekStartDate } = args;
      console.log('[weeklyHoroscopeByUser] called with:', { email, weekStartDate });
      if (!email || !weekStartDate) {
        console.log('[weeklyHoroscopeByUser] Missing email or weekStartDate');
        return null;
      }
      const weekStart = new Date(weekStartDate);
      let result = await WeeklyHoroscopeService.getUserWeeklyHoroscope(email, weekStart);
      console.log('[weeklyHoroscopeByUser] Initial fetch result:', result);
      if (!result) {
        // Generate and save if not found
        console.log('[weeklyHoroscopeByUser] No result found, generating...');
        await WeeklyHoroscopeService.generateWeeklyHoroscopeForUser(email, weekStart);
        // Try fetching again
        result = await WeeklyHoroscopeService.getUserWeeklyHoroscope(email, weekStart);
        console.log('[weeklyHoroscopeByUser] After generation fetch result:', result);
        if (!result) {
          console.log('[weeklyHoroscopeByUser] Still no result after generation. Returning null.');
          return null;
        }
      }
      // Map weekdays to dailyHoroscopes array in the order generated (today first)
      const dailyHoroscopes = Object.entries(result.weekdays).map(([weekday, data]: any, i) => ({
        id: '',
        weekday: weekday as import("../../interfaces/WeeklyNews").IWeekdays,
        date: data?.date || '',
        zodiacSign: result.zodiacSign,
        title: '',
        prediction: data?.advice || '',
        mood: data?.mood || 'neutral',
        energy: data?.energy || 'medium',
        isPublished: true,
        createdAt: data?.date || '',
        updatedAt: data?.date || '',
        weeklyOverview: i === 0 ? result.weeklyOverview : undefined
      }));

      // Find today's weekday string (e.g., 'monday')
      const today = new Date();
      const weekdayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const todayWeekday = weekdayNames[today.getDay()];
      const todayHoroscope = dailyHoroscopes.find(h => h.weekday === todayWeekday);
      console.log('[weeklyHoroscopeByUser] Returning weekly horoscope:', {
        id: '',
        weekStartDate: result.weekStartDate,
        weekEndDate: new Date(new Date(result.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000),
        zodiacSign: result.zodiacSign,
        dailyHoroscopes,
        weeklyOverview: result.weeklyOverview,
        todayHoroscope,
        createdAt: result.weekStartDate,
        updatedAt: result.weekStartDate
      });
      return {
        id: '',
        weekStartDate: result.weekStartDate,
        weekEndDate: new Date(new Date(result.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000),
        zodiacSign: result.zodiacSign,
        dailyHoroscopes,
        weeklyOverview: result.weeklyOverview,
        todayHoroscope,
        createdAt: result.weekStartDate,
        updatedAt: result.weekStartDate
      };
    },
  },
};