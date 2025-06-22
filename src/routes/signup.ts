import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { connection } from '../database/connection';
import { Logger } from '../models/Logger'; 
import bcrypt from 'bcryptjs'; 
import zodiacChartRouter, { createUserChartPointsIfNotExists } from './zodiacChart';

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
    const conn = await connection.getConnection();
    let transactionStarted = false;
    let userId: number | null = null;
    try {
      await conn.beginTransaction();
      transactionStarted = true;

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert into users (use hashedPassword)
      const [userResult]: any = await conn.execute(
        `INSERT INTO users (email, password, username, registered) VALUES (?, ?, ?, UNIX_TIMESTAMP())`,
        [email, hashedPassword, name]
      );
      userId = userResult.insertId;

      // Insert into user_details
      await conn.execute(
        `INSERT INTO user_details (user_id, birthdate, birthtime, birth_city, birth_country) VALUES (?, ?, ?, ?, ?)`,
        [userId, dateOfBirth, timeOfBirth, city, country]
      );

      await conn.commit();
      transactionStarted = false;

      // Create user chart OUTSIDE the transaction
      if (userId !== null) {
        await createUserChartPointsIfNotExists(userId, dateOfBirth, timeOfBirth, city, country);
      }

      return {
        success: true,
        message: `User ${name} signed up successfully!`,
      };
    } catch (err: any) {
      if (transactionStarted) await conn.rollback();
      Logger.error(err); 
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
    } finally {
      conn.release();
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
