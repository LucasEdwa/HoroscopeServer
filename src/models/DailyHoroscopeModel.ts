import {connection} from '../database/connection';
import {IDailyHoroscope} from '../interfaces/WeeklyNews';

export class HoroscopeService {


  static async setupDailyHoroscopeTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS horoscope_daily (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        weekday ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
        date DATE NOT NULL,
        zodiac_sign VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        prediction TEXT NOT NULL,
        love_life TEXT,
        career TEXT,
        health TEXT,
        finances TEXT,
        lucky_numbers VARCHAR(255),
        lucky_colors VARCHAR(255),
        compatibility VARCHAR(255),
        mood ENUM('excellent', 'good', 'neutral', 'challenging', 'difficult') NOT NULL,
        energy ENUM('high', 'medium', 'low') NOT NULL,
        image_url VARCHAR(255),
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_daily_horoscope (zodiac_sign, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await connection.query(sql);
  }

  static async setupWeeklyHoroscopeTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS horoscope_weekly (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        zodiac_sign VARCHAR(50),
        daily_horoscopes TEXT,
        weekly_overview TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_weekly_horoscope (zodiac_sign, week_start_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await connection.query(sql);
    console.log("Weekly horoscope table created successfully.");
  }

  static async getDailyHoroscope(zodiacSign: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const sql = `SELECT * FROM horoscope_daily WHERE zodiac_sign = ? AND date = ? AND is_published = TRUE`;
    const [rows] = await connection.query<any[]>(sql, [zodiacSign.toLowerCase(), targetDate]);
    return rows[0] || null;
  }

  static async getDailyHoroscopesByWeek(zodiacSign: string, weekStartDate: string) {
    const sql = `
      SELECT * FROM horoscope_daily 
      WHERE zodiac_sign = ? 
      AND date >= ? 
      AND date < DATE_ADD(?, INTERVAL 7 DAY)
      AND is_published = TRUE
      ORDER BY date ASC
    `;
    return connection.query(sql, [zodiacSign.toLowerCase(), weekStartDate, weekStartDate]);
  }

  static async getAllDailyHoroscopesForDate(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const sql = `SELECT * FROM horoscope_daily WHERE date = ? AND is_published = TRUE ORDER BY zodiac_sign`;
    return connection.query(sql, [targetDate]);
  }

  static async addDailyHoroscope(horoscope: Partial<IDailyHoroscope>) {
    const sql = `
      INSERT INTO horoscope_daily (
        id, weekday, date, zodiac_sign, title, prediction, love_life, career, health, finances, lucky_numbers, lucky_colors, compatibility, mood, energy, image_url, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      horoscope.id || null,
      horoscope.weekday,
      horoscope.date,
      horoscope.zodiacSign ? horoscope.zodiacSign.toLowerCase() : (() => { throw new Error("zodiacSign is required"); })(),
      horoscope.title,
      horoscope.prediction,
      horoscope.loveLife,
      horoscope.career,
      horoscope.health,
      horoscope.finances,
      horoscope.luckyNumbers ? horoscope.luckyNumbers.join(',') : null,
      horoscope.luckyColors ? horoscope.luckyColors.join(',') : null,
      horoscope.compatibility ? horoscope.compatibility.join(',') : null,
      horoscope.mood,
      horoscope.energy,
      horoscope.imageUrl,
      horoscope.isPublished !== undefined ? horoscope.isPublished : true,
      horoscope.createdAt || new Date(),
      horoscope.updatedAt || new Date(),
    ];
    await connection.query(sql, params);
  }

  static async updateDailyHoroscope(id: string, updates: Partial<IDailyHoroscope>) {
    const fields = Object.keys(updates).map(key => {
      if (key === 'luckyNumbers' || key === 'luckyColors' || key === 'compatibility') {
        return `${key} = ?`;
      }
      return `${key} = ?`;
    });
    const sql = `UPDATE horoscope_daily SET ${fields.join(', ')} WHERE id = ?`;
    const params = [...Object.values(updates), id];
    await connection.query(sql, params);
  }

  static async deleteDailyHoroscope(id: string) {
    const sql = `DELETE FROM horoscope_daily WHERE id = ?`;
    await connection.query(sql, [id]);
  }
}