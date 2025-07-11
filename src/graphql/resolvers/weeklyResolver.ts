import { IWeeklyHoroscope } from "../../interfaces/WeeklyNews";
import { connection } from "../../database/connection";
import { askWeeklyOracle } from "../../utils/ai/askWeeklyOracle";

export const weeklyHoroscopeResolvers = {
  Query: {
    /**
     * Fetch weekly horoscope for the authenticated user
     */
    async weeklyHoroscope(
      _: any,
      args: { zodiacSign: string; weekStartDate: string },
      context: any
    ): Promise<IWeeklyHoroscope | null> {
      const { zodiacSign, weekStartDate } = args;
      if (!zodiacSign || !weekStartDate) return null;
      return getWeeklyHoroscopeByZodiacSignAndWeek(zodiacSign, weekStartDate);
    },
  },
};

async function getWeeklyHoroscopeByZodiacSignAndWeek(zodiacSign: string, weekStartDate: string): Promise<IWeeklyHoroscope | null> {
  // Fetch the week for the given zodiac sign and weekStartDate
  const [rows]: any = await connection.execute(
    `SELECT * FROM weekly_news WHERE zodiac_sign = ? AND week_start_date = ? LIMIT 1`,
    [zodiacSign.toLowerCase(), weekStartDate]
  );
  if (!rows?.length) return null;
  const weekly = rows[0];

  // Fetch daily entries for this week
  const [dailyRows]: any = await connection.execute(
    `SELECT * FROM daily_news WHERE weekly_news_id = ? ORDER BY date ASC`,
    [weekly.id]
  );

  // Build the IWeeklyHoroscope object
  return {
    id: weekly.id,
    weekStartDate: weekly.week_start_date,
    weekEndDate: weekly.week_end_date,
    zodiacSign: weekly.zodiac_sign,
    weeklyOverview: weekly.overview,
    dailyHoroscopes: dailyRows || [],
    createdAt: weekly.created_at,
    updatedAt: weekly.updated_at,
  };
}

export async function createWeeklyHoroscope(
  email: string,
  weekStartDate: string
): Promise<IWeeklyHoroscope> {
  // Ask the oracle for the weekly horoscope
  const weeklyData = await askWeeklyOracle(email, weekStartDate);
  if (!weeklyData) throw new Error("Failed to generate weekly horoscope");

  // Save the weekly horoscope to the database
  const { week_start_date, week_end_date, zodiac_sign, overview, daily } = weeklyData;

  const [result]: any = await connection.execute(
    `INSERT INTO weekly_news (week_start_date, week_end_date, zodiac_sign, overview) VALUES (?, ?, ?, ?)`,
    [week_start_date, week_end_date, zodiac_sign.toLowerCase(), overview]
  );

  const weeklyId = result.insertId;

  // Save each daily horoscope entry
  for (const day of daily) {
    await connection.execute(
      `INSERT INTO daily_news (weekly_news_id, weekday, date, zodiac_sign, title, prediction) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        weeklyId,
        day.weekday,
        day.date,
        zodiac_sign.toLowerCase(),
        day.title,
        day.prediction,
      ]
    );
  }

  const horoscope = await getWeeklyHoroscopeByZodiacSignAndWeek(zodiac_sign, week_start_date);
  if (!horoscope) throw new Error("Failed to retrieve the created weekly horoscope");
  return horoscope;
}
