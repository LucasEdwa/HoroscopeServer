export const weeklyHoroscopeTypeDefs = `
  enum Weekdays {
    monday
    tuesday
    wednesday
    thursday
    friday
    saturday
    sunday
  }

  enum Mood {
    excellent
    good
    neutral
    challenging
    difficult
  }

  enum Energy {
    high
    medium
    low
  }

  type DailyHoroscope {
    id: ID!
    weekday: Weekdays!
    date: String!
    zodiacSign: String!
    title: String
    prediction: String!
    loveLife: String
    career: String
    health: String
    finances: String
    luckyNumbers: [Int!]
    luckyColors: [String!]
    compatibility: [String!]
    mood: Mood!
    energy: Energy!
    imageUrl: String
    isPublished: Boolean!
    createdAt: String!
    updatedAt: String!
    weeklyOverview: String
  }

  type WeeklyHoroscope {
    id: ID!
    weekStartDate: String!
    weekEndDate: String!
    zodiacSign: String
    dailyHoroscopes: [DailyHoroscope!]!
    weeklyOverview: String
    todayHoroscope: DailyHoroscope
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    weeklyHoroscope(zodiacSign: String!, weekStartDate: String!): WeeklyHoroscope
    weeklyHoroscopeByUser(email: String!, weekStartDate: String!): WeeklyHoroscope
  }
`;