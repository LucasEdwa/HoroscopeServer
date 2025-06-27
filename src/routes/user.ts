import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { signupUser, signinUser, getUserDetails } from '../controllers/userController';

const schema = buildSchema(`
  type ChartPoint {
    pointType: String
    sign: String
    description: String
    house: Int
  }

  type User {
    id: ID!
    email: String
    username: String
    birthdate: String
    birthtime: String
    birth_city: String
    birth_country: String
    chartPoints: [ChartPoint]
  }

  type SignupResponse {
    success: Boolean!
    message: String!
  }

  type SigninResponse {
    success: Boolean!
    message: String!
    email: String
  }

  type Query {
    user(email: String!): User
  }

  type Mutation {
    signup(
      name: String!
      email: String!
      password: String!
      dateOfBirth: String!
      timeOfBirth: String!
      city: String!
      country: String!
    ): SignupResponse!

    signin(
      email: String!
      password: String!
    ): SigninResponse!
  }
`);

const root = {
  signup: signupUser,
  signin: signinUser,
  user: getUserDetails
};

const router = express.Router();

router.use(
  '/',
  graphqlHTTP((req) => ({
    schema,
    rootValue: root,
    graphiql: true,
    context: { user: (req as any).user },
  }))
);

// Note: For GraphQL endpoints, you must use a POST request with a JSON body containing a "query" field.
// Example curl for signup mutation:
//
//
// Replace values as needed.
//
// This is required because GraphQL expects a query string, not plain JSON fields.

export default router;
