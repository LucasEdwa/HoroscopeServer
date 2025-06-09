import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { connection } from '../database/connection'; 
const router = Router();

const schema = buildSchema(`
  type Mutation {
    signin(
      email: String!
      password: String!
    ): SigninResponse!
  }

  type SigninResponse {
    success: Boolean!
    message: String!
  }

  type Query {
    _empty: String
  }
`);

const root = {
  signin: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {

      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      await connection.end();

      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0] as any;
        if (user.password === password) {
          return {
            success: true,
            message: 'Sign in successful!',
          };
        } else {
          return {
            success: false,
            message: 'Incorrect password.',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Signin failed. ' + (err.message || ''),
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
