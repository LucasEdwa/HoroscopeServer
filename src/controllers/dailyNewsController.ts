// import { Request, Response } from "express";
// import { askDailyAstroAdvice } from "../utils/ChatOi";
// import { getUserChartByEmail } from "./astronomiaController";
// import { DailyNews } from "../models/DailyNews";

// // Fetch daily news for today (optionally by user)
// export const getDailyNews = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { userId } = req.query;
//     const news = await DailyNews.getDailyNews(userId ? Number(userId) : undefined);
//     res.json({ news });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message || "Failed to fetch daily news" });
//   }
// };

// // Create daily news with custom content
// export const createDailyNews = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { userId, title, content } = req.body;
//     if (!userId || !title || !content) {
//       res.status(400).json({ error: "userId, title, and content are required" });
//       return;
//     }
//     const result = await DailyNews.addDailyNews(userId, title, content);
//     res.json(result);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message || "Failed to add daily news" });
//   }
// };

// // Generate and save daily astro advice for a user (using email and userId)
// export const generateAndSaveDailyAstroAdvice = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { email, userId } = req.body;
//     if (!email || !userId) {
//        res.status(400).json({ error: "email and userId are required" });
//        return;
//     }
//     const chart = await getUserChartByEmail(email);
//     if (!chart) {
//       res.status(404).json({ error: "User chart not found" });
//       return ;
//     }
//     const advice = await askDailyAstroAdvice(chart);
//     const title = "Your Daily Astro Advice";
//     const result = await DailyNews.addDailyNews(userId, title, advice);
//     res.json({ success: true, id: result.id, advice });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message || "Failed to generate daily astro advice" });
//   }
// };
