import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';

import { connection } from './database/connection';

import { Logger } from './models/Logger';
import { UserDatabase } from './models/UserDatabase';
import { SignsDatabase } from './models/Signs';

import userRouter from './routes/user'; 
import oracleRouter from './routes/oracle';
import { schema as fullChartPointsSchema, root as fullChartPointsRoot } from './routes/fullChartPoints';


const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());



app.use(
  '/full-chart-points',
  graphqlHTTP({
    schema: fullChartPointsSchema,
    rootValue: fullChartPointsRoot,
    graphiql: true,
  })
);

app.use('/user', userRouter);
app.use('/oracle', oracleRouter);

;

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
