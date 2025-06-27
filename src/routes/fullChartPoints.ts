import { buildSchema } from 'graphql';
import { getFullChartPointsWithSwisseph } from '../controllers/fullChartPointsController';
import { getUserAstronomiaChartGraphQL } from '../controllers/astronomiaController';

// --- GraphQL Schema Definition ---
export const schema = buildSchema(`
  type ChartPoint {
    type: String
    sign: String
    house: Int
  }

  type Sun {
    longitude: Float
    sign: String
  }

  type Chart {
    sun: Sun
    birthdate: String
    birthtime: String
    birth_city: String
    birth_country: String
    latitude: Float
    longitude: Float
  }

  type Query {
    fullChartPoints(email: String!): [ChartPoint]!
    fullChartPointsReal(email: String!): [ChartPoint]!
    userAstronomiaChart(email: String!): Chart
  }
`);

// --- Resolver Functions ---
const fullChartPoints = async ({ email }: { email: string }) => {
  return await getFullChartPointsWithSwisseph(email);
};

// Add other resolver functions here as needed, e.g. fullChartPointsReal

// --- Root Object ---
export const root = {
  fullChartPoints,
  // fullChartPointsReal: ... (add when implemented)
  userAstronomiaChart: getUserAstronomiaChartGraphQL,
};