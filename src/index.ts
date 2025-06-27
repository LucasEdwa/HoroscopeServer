import 'dotenv/config'; 
import express, {Request,Response} from 'express';
import cors from 'cors';
import axios from 'axios';
import { graphqlHTTP } from 'express-graphql';

import { Logger } from './models/Logger';
import { connection } from './database/connection';
import { UserDatabase } from './models/UserDatabase';
import { SignsDatabase } from './models/Signs';
import userRouter from './routes/user'; 

import astronomiaRouter from './routes/astronomia';
import { schema as fullChartPointsSchema, root as fullChartPointsRoot } from './routes/fullChartPoints';


const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('HoroscopeServer ChatGPT API is running.');
});

// Mount GraphQL endpoint for full chart points BEFORE any '/' routes
app.use(
  '/full-chart-points',
  graphqlHTTP({
    schema: fullChartPointsSchema,
    rootValue: fullChartPointsRoot,
    graphiql: true,
  })
);

app.use('/user', userRouter);
;
app.use('/', astronomiaRouter);

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

const userDatabase = new UserDatabase(connection);
const signsDatabase = new SignsDatabase();



app.listen(PORT, async () => {
  try {
    await userDatabase.init();
    await signsDatabase.init();
    // await userDatabase.dropAllUserRelatedTables();
    console.log("User database initialized successfully.");
    console.log("Signs database initialized successfully.");
  } catch (error: any) {
    Logger.error(error);
    console.error("Error initializing user database:", error.message || error);
  }
  console.log(`Server running on http://localhost:${PORT}`);
  // Generate and display question/answer after server starts
});
