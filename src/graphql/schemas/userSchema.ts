export const userTypeDefs = `
  type ChartPoint {
    name: String!
    longitude: Float!
    latitude: Float!
    sign: String!
    house: Int!
    degree: Int!
    minute: Int!
    second: Int!
    planet_type: String!
    distance: Float
  }

  type User {
    id: ID!
    username: String!
    email: String!
    birthdate: String
    birthtime: String
    birth_city: String
    birth_country: String
    chartPoints: [ChartPoint!]!
  }

  type SignupResponse {
    success: Boolean!
    message: String!
  }

  type SigninResponse {
    success: Boolean!
    message: String!
    email: String
    token: String
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
`;