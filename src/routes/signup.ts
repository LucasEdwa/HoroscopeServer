import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import mysql from 'mysql2/promise';
import {connection} from '../database/connection'
const router = Router();

const schema = buildSchema(`
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
  }

  type SignupResponse {
    success: Boolean!
    message: String!
  }

  type Query {
    _empty: String
  }
`);

const root = {
  signup: async ({
    name,
    email,
    password,
    dateOfBirth,
    timeOfBirth,
    city,
    country,
  }: {
    name: string;
    email: string;
    password: string;
    dateOfBirth: string;
    timeOfBirth: string;
    city: string;
    country: string;
  }) => {
    try {

      await connection.execute(
        `INSERT INTO users (name, email, password, dateOfBirth, timeOfBirth, city, country)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, password, dateOfBirth, timeOfBirth, city, country]
      );

      await connection.end();

      return {
        success: true,
        message: `User ${name} signed up successfully!`,
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        return {
          success: false,
          message: 'Email already exists.',
        };
      }
      return {
        success: false,
        message: 'Signup failed. ' + (err.message || ''),
      };
    }
  },
};

router.use(
  '/',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
);

export default router;
