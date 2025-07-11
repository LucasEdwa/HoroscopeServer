import { connection } from '../database/connection';
import { RowDataPacket } from 'mysql2';

export class OracleQuestionsTable {
  static async setupOracleQuestionsTable(): Promise<void> {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS oracle_questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await connection.execute(createTableQuery);
      console.log('Oracle questions table created/verified successfully.');

      // Check if table exists and has correct structure
      const [rows] = await connection.execute<RowDataPacket[]>(
        'DESCRIBE oracle_questions'
      );
      
    } catch (error) {
      console.error('Error setting up oracle questions table:', error);
      throw error;
    }
  }

  static async dropOracleQuestionsTable(): Promise<void> {
    try {
      await connection.execute('DROP TABLE IF EXISTS oracle_questions');
      console.log('Oracle questions table dropped successfully.');
    } catch (error) {
      console.error('Error dropping oracle questions table:', error);
      throw error;
    }
  }
}
