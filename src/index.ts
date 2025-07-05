import 'dotenv/config';
import express, { Request } from 'express';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';

import { connection } from './database/connection';
import { Logger } from './models/Logger';
import { UserDatabase } from './models/UserDatabase';
import { SignsDatabase } from './models/Signs';
import { DailyNews } from './models/DailyNews';
import { OracleQuestionsTable } from './models/OracleQuestions';

import { userTypeDefs } from './graphql/schemas/userSchema';
import { oracleTypeDefs } from './graphql/schemas/oracleSchema';
import { userResolvers } from './graphql/resolvers/userResolver';
import { oracleResolvers } from './graphql/resolvers/oracleResolver';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Define GraphQL schema and resolvers
const typeDefs = `
  ${userTypeDefs}
  ${oracleTypeDefs}
  
  extend type Query {
    getOracleHistory(email: String!): [OracleQuestion!]!
    getOracleQuestion(id: Int!): OracleQuestion
    getComprehensiveFuture(email: String!, timeframe: String): ComprehensiveFuture!
  }

  extend type Mutation {
    submitOracleQuestion(input: AskOracleInput!): OracleQuestion!
    deleteOracleQuestion(id: Int!): OracleQuestion!
  }
`;

const rootValue = {
  ...(userResolvers.Query || {}),
  ...(userResolvers.Mutation || {}),
  ...(oracleResolvers.Query || {}),
  ...(oracleResolvers.Mutation || {}),
};

// GraphQL endpoint
app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildSchema(typeDefs),
    rootValue: rootValue,
    graphiql: true,
    
    context: ({ req }: { req: Request }) => {
      console.log('Debug: Request body:', req.body); // Log the request body
      return { req };
    },
  })
);


// Initialize databases and start the server
const userDatabase = new UserDatabase(connection);
const signsDatabase = new SignsDatabase();

app.listen(PORT, async () => {
  try {
    await userDatabase.init();
    await signsDatabase.init();
    // await userDatabase.dropAllUserRelatedTables();
    await DailyNews.setupDailyNewsTable();
    await OracleQuestionsTable.setupOracleQuestionsTable();
    console.log('User database initialized successfully.');
    console.log('Signs database initialized successfully.');
    console.log('Daily news table initialized successfully.');
    console.log('Oracle questions table initialized successfully.');
  } catch (error: any) {
    Logger.error(error);
    console.error('Error initializing databases:', error.message || error);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});