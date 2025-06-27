import { Router } from 'express';
import { getUserAstronomiaChart } from '../controllers/astronomiaController';

const router = Router();

router.post('/astronomia-chart', (req, res) => {
  getUserAstronomiaChart(req, res).catch((err) => {
    res.status(500).json({ error: err.message || 'Internal server error' });
  });
});

export default router;
