import 'dotenv/config';
import express, { Request } from 'express';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';

import { connection } from './database/connection';
import { Logger } from './models/Logger';
import { UserDatabase } from './models/UserDatabase';
import { SignsDatabase } from './models/Signs';
import { OracleQuestionsTable } from './models/OracleQuestions';
import playground from 'graphql-playground-middleware-express';
  import { userTypeDefs } from './graphql/schemas/userSchema';
import { oracleTypeDefs } from './graphql/schemas/oracleSchema';
import { userResolvers } from './graphql/resolvers/userResolver';
import { oracleResolvers } from './graphql/resolvers/oracleResolver';

const app = express();
const PORT = process.env.PORT || 3001;
app.get('/playground', playground({ endpoint: '/graphql' }));

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
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

// Create rootValue that properly handles context
const createRootValue = (context: any) => {
  return {
    // User queries
    me: (args: any) => userResolvers.Query?.me(args, context),
    user: (args: any) => userResolvers.Query?.user(args, context),
    validateToken: (args: any) => userResolvers.Query?.validateToken(args, context),
    
    // User mutations (these don't need context)
    signup: (args: any) => userResolvers.Mutation?.signup(args),
    signin: (args: any) => userResolvers.Mutation?.signin(args),
    
    // Oracle queries
    getOracleHistory: (args: any) => oracleResolvers.Query?.getOracleHistory(args, context),
    getOracleQuestion: (args: any) => oracleResolvers.Query?.getOracleQuestion(args, context),
    getComprehensiveFuture: (args: any) => oracleResolvers.Query?.getComprehensiveFuture(args, context),
    
    // Oracle mutations
    submitOracleQuestion: (args: any) => oracleResolvers.Mutation?.submitOracleQuestion(args, context),
    deleteOracleQuestion: (args: any) => oracleResolvers.Mutation?.deleteOracleQuestion(args, context),
  };
};

// GraphQL endpoint
app.use(
  '/graphql',
  graphqlHTTP((request, response) => {
    console.log('Debug: GraphQL request headers:', request.headers);
    console.log('Debug: Authorization header:', request.headers.authorization);
    
    const context = { req: request };
    return {
      schema: buildSchema(typeDefs),
      rootValue: createRootValue(context),
      graphiql: true,
      context: context,
    };
  })
);

// Add cache statistics endpoint before the server initialization
app.get('/cache-stats', (req, res) => {
  try {
    // Import here to avoid circular dependencies
    const { getChartCacheStats } = require('./services/swissephService');
    const stats = getChartCacheStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        server: `Oracle Chart Caching System`,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// Add simple authentication test endpoint
app.get('/test-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  res.json({
    hasAuthHeader: !!authHeader,
    authHeader: authHeader,
    token: token,
    allHeaders: req.headers
  });
});

// Add cache management endpoint
app.post('/cache/clear', (req, res) => {
  try {
    const { ChartCache } = require('./utils/chartCaching');
    const { type } = req.body;
    
    if (type === 'all') {
      ChartCache.clearAllCaches();
      res.json({ success: true, message: 'All caches cleared successfully' });
    } else if (type === 'expired') {
      ChartCache.cleanupExpiredCaches();
      res.json({ success: true, message: 'Expired caches cleaned up successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid cache clear type. Use "all" or "expired"' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize databases and start the server
const userDatabase = new UserDatabase(connection);
const signsDatabase = new SignsDatabase();

app.listen(PORT, async () => {
  try {
    await userDatabase.init();
    await signsDatabase.init();
    // await userDatabase.dropAllUserRelatedTables();
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