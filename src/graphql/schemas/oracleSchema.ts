export const oracleTypeDefs = `
  type OracleQuestion {
    id: Int!
    email: String!
    question: String!
    answer: String!
    created_at: String!
  }

  type ComprehensiveFuture {
    email: String!
    timeframe: String!
    prediction: String!
    generated_at: String!
  }

  input AskOracleInput {
    email: String!
    question: String!
    chart: String
  }
`;
