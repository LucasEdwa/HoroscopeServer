import 'dotenv/config'; 
import express, {Request,Response} from 'express';
import cors from 'cors';
import axios from 'axios';
import signupRouter from './routes/signup';
import signinRouter from './routes/signin';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import zodiacChartRouter from './routes/zodiacChart';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Logging utility
function logError(error: any) {
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  const logPath = path.join(logsDir, 'error.log');
  const logEntry = `[${new Date().toISOString()}] ${typeof error === 'string' ? error : JSON.stringify(error)}\n`;
  fs.appendFile(logPath, logEntry, err => {
    if (err) console.error('Failed to write to error.log:', err);
  });
}

app.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const { question } = req.body;
  if (!question) {
    res.status(400).json({ error: 'Question is required.' });
    return;
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: question }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const answer = response.data.choices?.[0]?.message?.content?.trim();
    res.json({ answer });
  } catch (error: any) {
    logError(error.response?.data || error.message); // Log error to file
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get('/', (_req, res) => {
  res.send('HoroscopeServer ChatGPT API is running.');
});

// Function to generate a random question
function generateQuestion(): string {
  const questions = [
    "What does my horoscope say for today?",
    "Will I have good luck this week?",
    "What should I focus on according to my zodiac sign?",
    "Is there anything I should be careful about today?",
    "How will my relationships go this month?"
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}


// Function to send question to /chat and log the answer
async function askAndDisplay() {
  const question = generateQuestion();
  try {
    const response = await axios.post(`http://localhost:${PORT}/chat`, { question });
    console.log("Question:", question);
    console.log("Answer:", response.data.answer);
  } catch (error: any) {
    logError(error.response?.data || error.message); // Log error to file
    console.error("Error:", error.response?.data || error.message);
  }
}

// MySQL connection setup
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'horoscope',
  port: Number(process.env.DB_PORT) || 3306, // <-- add this line
};



async function initDB() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port, // <-- add this line
  });

  // Create database if not exists
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);

  // Use the database
  await connection.query(`USE \`${dbConfig.database}\``);

  // Create users table if not exists
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      dateOfBirth DATE,
      timeOfBirth TIME,
      city VARCHAR(100),
      country VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.end();
}

// Mount GraphQL endpoint at /signup
app.use(
  '/signup',
  signupRouter
);

app.use(
  '/signin',
  signinRouter
);

app.use('/zodiac-chart', zodiacChartRouter);

app.listen(PORT, async () => {
  await initDB(); // <-- Ensure DB and table are created before server starts
  console.log(`Server running on http://localhost:${PORT}`);
  // Generate and display question/answer after server starts
});
