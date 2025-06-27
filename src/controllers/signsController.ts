import { SignsDatabase } from '../models/Signs';
import { Logger } from '../models/Logger';
import { Request, Response } from 'express';

const signsDatabase = new SignsDatabase();

// Initialize signs and chart tables, and insert zodiac signs
export const initSignsAndChartTables = async () => {
  try {
    await signsDatabase.init();
    Logger.info("Signs and user_charts tables initialized successfully.");
  } catch (error: any) {
    Logger.error(error);
    console.error("Error initializing signs/user_charts tables:", error.message || error);
  }
};

// Drop all signs-related tables
export const dropAllSignsRelatedTables = async () => {
  try {
    await signsDatabase.dropAllSignsRelatedTables();
    Logger.info("All signs-related tables dropped.");
  } catch (error: any) {
    Logger.error(error);
    console.error("Error dropping signs-related tables:", error.message || error);
  }
};

// Fetch all zodiac signs
export const getAllZodiacSigns = async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await signsDatabase['db'].query('SELECT * FROM signs');
    res.json(rows);
  } catch (error: any) {
    Logger.error(error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Fetch all chart points for a user
export const getUserChartPoints = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  try {
    const [rows]: any = await signsDatabase['db'].query(
      `SELECT ucp.*, s.name AS sign, s.description
       FROM user_chart_points ucp
       LEFT JOIN signs s ON ucp.sign_id = s.id
       WHERE ucp.user_id = ?`,
      [userId]
    );
    res.json(rows);
  } catch (error: any) {
    Logger.error(error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};
