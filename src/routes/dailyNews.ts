import { Router } from "express";
import { getDailyNews, generateAndSaveDailyAstroAdvice } from "../controllers/dailyNewsController";

const router = Router();

router.get("/", getDailyNews);
// router.post("/", createDailyNews);
router.post("/", generateAndSaveDailyAstroAdvice);

export default router;
