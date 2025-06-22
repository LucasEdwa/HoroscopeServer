import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { connection } from '../database/connection'; 
const router = Router();

const schema = buildSchema(`
  type ChartPoint {
    pointType: String!
    sign: String
    description: String
    house: Int
  }

  type User {
    id: ID!
    email: String!
    username: String!
    birthdate: String!
    birthtime: String!
    birth_city: String!
    birth_country: String!
    chartPoints: [ChartPoint!]!
  }

  type Mutation {
    signin(
      email: String!
      password: String!
    ): SigninResponse!
  }

  type SigninResponse {
    success: Boolean!
    message: String!
    email: String
  }

  type Query {
    user(email: String!): User
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
      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0] as any;
        if (user.password === password) {
          return {
            success: true,
            message: 'Sign in successful!',
            email: user.email, // <-- return email
          };
        } else {
          return {
            success: false,
            message: 'Incorrect password.',
            email: null,
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found.',
          email: null,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Signin failed. ' + (err.message || ''),
        email: null,
      };
    }
  },
  user: async ({ email }: { email: string }) => {
    try {
      // Fetch user basic info
      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      if (!Array.isArray(userRows) || userRows.length === 0) return null;
      const user = userRows[0] as any;

      // Fetch chart points for the user
      const [chartRows] = await connection.execute(
        'SELECT pointType, sign, description, house FROM chart_points WHERE user_id = ?',
        [user.id]
      );

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        birthdate: user.birthdate,
        birthtime: user.birthtime,
        birth_city: user.birth_city,
        birth_country: user.birth_country,
        chartPoints: Array.isArray(chartRows) ? chartRows : [],
      };
    } catch (err) {
      return null;
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
