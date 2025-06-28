import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { askOracleQuestion } from '../controllers/oracleController';

const schema = buildSchema(`
  type OracleAnswer {
    question: String!
    answer: String!
  }

  type Query {
    oracle(email: String!, question: String!): OracleAnswer!
  }
`);

const root = {
  oracle: askOracleQuestion
};

const router = express.Router();

router.use(
  '/',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
);

export default router;
