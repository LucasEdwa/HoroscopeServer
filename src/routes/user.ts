import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { connection } from '../database/connection';

// Fetch all chart points for a user, joining sign info in one query
async function getUserChartPoints(userId: number) {
  const [rows]: any = await connection.execute(
    `SELECT ucp.point_type, s.name AS sign, s.description, ucp.house_number
     FROM user_chart_points ucp
     LEFT JOIN signs s ON ucp.sign_id = s.id
     WHERE ucp.user_id = ?`,
    [userId]
  );
  return rows.map((row: any) => ({
    pointType: row.point_type,
    sign: row.sign ?? null,
    description: row.description ?? null,
    house: row.house_number ?? null
  }));
}

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

  type Query {
    user(email: String!): User
  }
`);

const root = {
  user: async ({ email }: { email: string }) => {
    // Get user and details
    const [userRows]: any = await connection.execute(
      `SELECT u.id, u.email, u.username, ud.birthdate, ud.birthtime, ud.birth_city, ud.birth_country
       FROM users u
       LEFT JOIN user_details ud ON u.id = ud.user_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!Array.isArray(userRows) || userRows.length === 0) return null;
    const user = userRows[0];

    // Get chart points (optimized)
    const chartPoints = await getUserChartPoints(user.id);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      birthdate: user.birthdate instanceof Date
        ? user.birthdate.toISOString().slice(0, 10)
        : user.birthdate,
      birthtime: user.birthtime,
      birth_city: user.birth_city,
      birth_country: user.birth_country,
      chartPoints
    };
  }
};

const router = Router();
router.use(
  '/',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
);

export default router;
