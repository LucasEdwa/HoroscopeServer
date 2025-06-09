import 'dotenv/config'; 
import express, {Request,Response} from 'express';
import cors from 'cors';
import axios from 'axios';
import signupRouter from './routes/signup';
import signinRouter from './routes/signin';
import { Logger } from './models/Logger';
import zodiacChartRouter from './routes/zodiacChart';
import { connection } from './database/connection';
import { UserDatabase } from './models/UserDatabase';
import { SignsDatabase } from './models/Signs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


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
    Logger.error(error.response?.data || error.message); // Log error to file
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
    Logger.error(error.response?.data || error.message); // Log error to file
    Logger.error("Error:", error.response?.data || error.message);
  }
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

const userDatabase = new UserDatabase(connection);
const signsDatabase = new SignsDatabase();

app.listen(PORT, async () => {
  try {
    await userDatabase.init(); // Initialize user database
    await signsDatabase.init(); // Initialize signs database
    console.log("User database initialized successfully.");
    console.log("Signs database initialized successfully.");
  } catch (error: any) {
    Logger.error(error);
    console.error("Error initializing user database:", error.message || error);
  }
  console.log(`Server running on http://localhost:${PORT}`);
  // Generate and display question/answer after server starts
});
