import { connection } from "../database/connection";

export class DailyNews {
  // Helper to execute queries with error handling
  private static async runQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
    try {
      const [rows]: any = await connection.execute(sql, params);
      return rows;
    } catch (error: any) {
      console.error("DailyNews query error:", error.message || error);
      throw new Error(error.message || "Database error");
    }
  }

  static async setupDailyNewsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS daily_news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        date DATE NOT NULL,
        UNIQUE KEY unique_user_date (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await this.runQuery(sql);
    console.log("Daily news table created successfully.");
  }
  
  static async getDailyNews(userId?: number) {
    let sql = `SELECT * FROM daily_news WHERE date = CURDATE()`;
    let params: any[] = [];
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    return this.runQuery(sql, params);
  }

  static async addDailyNews(userId: number, title: string, content: string) {
    const sql = `INSERT INTO daily_news (user_id, title, content, date) VALUES (?, ?, ?, CURDATE())`;
    const result: any = await this.runQuery(sql, [userId, title, content]);
    return { success: true, id: result.insertId };
  }

}