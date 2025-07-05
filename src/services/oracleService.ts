import { connection } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { askOracle } from '../utils/ChatOi';

export interface OracleQuestion {
  id?: number;
  email: string;
  question: string;
  answer: string;
  created_at?: Date;
}

export class OracleService {
  static async saveOracleQuestion(data: Omit<OracleQuestion, 'id' | 'created_at'>): Promise<OracleQuestion> {
    try {
      const query = `
        INSERT INTO oracle_questions (email, question, answer, created_at)
        VALUES (?, ?, ?, NOW())
      `;
      
      const [result] = await connection.execute<ResultSetHeader>(
        query,
        [data.email, data.question, data.answer]
      );
      
      if (!result.insertId) {
        throw new Error('Failed to insert oracle question');
      }
      
      // Get the inserted record using the correct column name
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT id, email, question, answer, created_at FROM oracle_questions WHERE id = ?',
        [result.insertId]
      );
      
      if (rows.length === 0) {
        throw new Error('Failed to retrieve inserted oracle question');
      }
      
      return rows[0] as OracleQuestion;
    } catch (error) {
      console.error('Error saving oracle question:', error);
      throw error;
    }
  }

  static async getOracleQuestionsByEmail(email: string): Promise<OracleQuestion[]> {
    try {
      const query = `
        SELECT id, email, question, answer, created_at 
        FROM oracle_questions 
        WHERE email = ? 
        ORDER BY created_at DESC
      `;
      
      const [rows] = await connection.execute<RowDataPacket[]>(query, [email]);
      return rows as OracleQuestion[];
    } catch (error) {
      console.error('Error getting oracle questions by email:', error);
      throw error;
    }
  }

  // Combined method that can get by email OR by id
  static async getOracleQuestion(params: { email?: string; id?: number }): Promise<OracleQuestion | OracleQuestion[] | null> {
    try {
      if (params.id) {
        // Get single question by ID
        const query = 'SELECT id, email, question, answer, created_at FROM oracle_questions WHERE id = ?';
        const [rows] = await connection.execute<RowDataPacket[]>(query, [params.id]);
        return rows.length > 0 ? (rows[0] as OracleQuestion) : null;
      } else if (params.email) {
        // Get all questions by email
        return this.getOracleQuestionsByEmail(params.email);
      } else {
        throw new Error('Either email or id must be provided');
      }
    } catch (error) {
      console.error('Error getting oracle question:', error);
      throw error;
    }
  }

 

  static async deleteOracleQuestion(id: number): Promise<OracleQuestion> {
    try {
      const existingQuestion = await this.getOracleQuestion({ id }) as OracleQuestion | null;
      if (!existingQuestion) {
        throw new Error('Oracle question not found');
      }
      
      const query = 'DELETE FROM oracle_questions WHERE id = ?';
      await connection.execute(query, [id]);
      
      return existingQuestion;
    } catch (error) {
      console.error('Error deleting oracle question:', error);
      throw error;
    }
  }

  static async getAllOracleQuestions(limit?: number, offset?: number): Promise<OracleQuestion[]> {
    try {
      let query = 'SELECT id, email, question, answer, created_at FROM oracle_questions ORDER BY created_at DESC';
      const params: any[] = [];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
        
        if (offset) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      return rows as OracleQuestion[];
    } catch (error) {
      console.error('Error getting all oracle questions:', error);
      throw error;
    }
  }

  // Method to generate oracle answer using AI with complete user data
  static async askOracleQuestion(input: { email: string; question: string; chart?: any }): Promise<{ question: string; answer: string }> {
    try {
      // Use the enhanced askOracle function with email to fetch complete user data
      const aiAnswer = await askOracle(input.question, input.chart || {}, input.email);
      
      return {
        question: input.question,
        answer: aiAnswer
      };
    } catch (error) {
      console.error('Error asking oracle question with AI:', error);
      // Fallback answer if AI fails
      return {
        question: input.question,
        answer: "The oracle is temporarily unavailable due to cosmic interference. Please try again later."
      };
    }
  }
}