import { connection } from "../database/connection";
import { IDailyHoroscope } from "../interfaces/WeeklyNews";

// Table creation utilities (not helpers, just for setup/migration)


export async function createDailyNewsTable() {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS daily_news (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id INT UNSIGNED NOT NULL,
      date DATE NOT NULL,
      weekday ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
      zodiac_sign ENUM('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces') NOT NULL,
      title VARCHAR(255) NOT NULL,
      prediction TEXT NOT NULL,
      love_life TEXT,
      career TEXT,
      health TEXT,
      finances TEXT,
      lucky_numbers JSON,
      lucky_colors JSON,
      compatibility JSON,
      mood ENUM('excellent', 'good', 'neutral', 'challenging', 'difficult') NOT NULL DEFAULT 'neutral',
      energy ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
      image_url VARCHAR(500),
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      weekly_overview TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_date_sign (user_id, date, zodiac_sign)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export class NewsDatabase {
  async getDailyNews(userId: number, zodiacSign: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const sql = `SELECT *, weekly_overview FROM daily_news WHERE user_id = ? AND zodiac_sign = ? AND date = ? AND is_published = TRUE`;
    const [rows]: any = await connection.execute(sql, [userId, zodiacSign.toLowerCase(), targetDate]);
    return rows[0] || null;
  }

  async getAllDailyNewsForDate(userId: number, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const sql = `SELECT * FROM daily_news WHERE user_id = ? AND date = ? AND is_published = TRUE ORDER BY zodiac_sign`;
    const [rows]: any = await connection.execute(sql, [userId, targetDate]);
    return rows;
  }

  async addDailyNews(horoscope: Partial<IDailyHoroscope>, userId: number) {
    const sql = `
      INSERT INTO daily_news (
        user_id, weekday, date, zodiac_sign, title, prediction, love_life, career, 
        health, finances, lucky_numbers, lucky_colors, compatibility, 
        mood, energy, image_url, is_published, weekly_overview
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      horoscope.weekday,
      horoscope.date,
      horoscope.zodiacSign?.toLowerCase(),
      horoscope.title,
      horoscope.prediction,
      horoscope.loveLife || null,
      horoscope.career || null,
      horoscope.health || null,
      horoscope.finances || null,
      horoscope.luckyNumbers ? JSON.stringify(horoscope.luckyNumbers) : null,
      horoscope.luckyColors ? JSON.stringify(horoscope.luckyColors) : null,
      horoscope.compatibility ? JSON.stringify(horoscope.compatibility) : null,
      horoscope.mood || 'neutral',
      horoscope.energy || 'medium',
      horoscope.imageUrl || null,
      horoscope.isPublished || false,
      horoscope.weeklyOverview || null
    ];
    const [result]: any = await connection.execute(sql, params);
    return { success: true, id: result.insertId };
  }

  async updateDailyNews(id: string, updates: Partial<IDailyHoroscope>) {
    const fields = [];
    const params = [];
    if (updates.title) { fields.push('title = ?'); params.push(updates.title); }
    if (updates.prediction) { fields.push('prediction = ?'); params.push(updates.prediction); }
    if (updates.loveLife !== undefined) { fields.push('love_life = ?'); params.push(updates.loveLife); }
    if (updates.career !== undefined) { fields.push('career = ?'); params.push(updates.career); }
    if (updates.health !== undefined) { fields.push('health = ?'); params.push(updates.health); }
    if (updates.finances !== undefined) { fields.push('finances = ?'); params.push(updates.finances); }
    if (updates.luckyNumbers) { fields.push('lucky_numbers = ?'); params.push(JSON.stringify(updates.luckyNumbers)); }
    if (updates.luckyColors) { fields.push('lucky_colors = ?'); params.push(JSON.stringify(updates.luckyColors)); }
    if (updates.compatibility) { fields.push('compatibility = ?'); params.push(JSON.stringify(updates.compatibility)); }
    if (updates.mood) { fields.push('mood = ?'); params.push(updates.mood); }
    if (updates.energy) { fields.push('energy = ?'); params.push(updates.energy); }
    if (updates.imageUrl !== undefined) { fields.push('image_url = ?'); params.push(updates.imageUrl); }
    if (updates.isPublished !== undefined) { fields.push('is_published = ?'); params.push(updates.isPublished); }
    if (fields.length === 0) throw new Error('No fields to update');
    params.push(id);
    const sql = `UPDATE daily_news SET ${fields.join(', ')} WHERE id = ?`;
    const [result]: any = await connection.execute(sql, params);
    return { success: result.affectedRows > 0 };
  }

  async deleteDailyNews(id: string) {
    const sql = `DELETE FROM daily_news WHERE id = ?`;
    const [result]: any = await connection.execute(sql, [id]);
    return { success: result.affectedRows > 0 };
  }

  async publishDailyNews(id: string) {
    return this.updateDailyNews(id, { isPublished: true });
  }

  async unpublishDailyNews(id: string) {
    return this.updateDailyNews(id, { isPublished: false });
  }
}