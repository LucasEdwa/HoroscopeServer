import { buildSchema } from 'graphql';
import { getFullChartPointsWithSwisseph } from '../controllers/fullChartPointsController';

export const schema = buildSchema(`
  type ChartPoint {
    type: String
    sign: String
    house: Int
  }

  type Query {
    fullChartPoints(email: String!): [ChartPoint]!
    fullChartPointsReal(email: String!): [ChartPoint]!
  }
`);

export const root = {
  fullChartPoints: async ({ email }: { email: string }) => {
    return await getFullChartPointsWithSwisseph(email);
  }
};