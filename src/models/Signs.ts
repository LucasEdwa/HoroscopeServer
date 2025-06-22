import { connection } from '../database/connection';
import { Logger } from './Logger';

const signsSqlStatements = [
  // Table for zodiac signs
  `CREATE TABLE IF NOT EXISTS signs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Table for user charts, relating users to signs for each house
  `CREATE TABLE IF NOT EXISTS user_charts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    house_1_sign_id INT UNSIGNED DEFAULT NULL,
    house_2_sign_id INT UNSIGNED DEFAULT NULL,
    house_3_sign_id INT UNSIGNED DEFAULT NULL,
    house_4_sign_id INT UNSIGNED DEFAULT NULL,
    house_5_sign_id INT UNSIGNED DEFAULT NULL,
    house_6_sign_id INT UNSIGNED DEFAULT NULL,
    house_7_sign_id INT UNSIGNED DEFAULT NULL,
    house_8_sign_id INT UNSIGNED DEFAULT NULL,
    house_9_sign_id INT UNSIGNED DEFAULT NULL,
    house_10_sign_id INT UNSIGNED DEFAULT NULL,
    house_11_sign_id INT UNSIGNED DEFAULT NULL,
    house_12_sign_id INT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (house_1_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_2_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_3_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_4_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_5_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_6_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_7_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_8_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_9_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_10_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_11_sign_id) REFERENCES signs(id),
    FOREIGN KEY (house_12_sign_id) REFERENCES signs(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // New table for chart points (planets, angles, etc.)
  `CREATE TABLE IF NOT EXISTS user_chart_points (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    point_type VARCHAR(32) NOT NULL, -- e.g. 'sun', 'ascendant', 'descendant', 'moon', 'venus', etc.
    sign_id INT UNSIGNED NOT NULL,
    house_number INT UNSIGNED DEFAULT NULL, -- 1-12, if applicable
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sign_id) REFERENCES signs(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

const zodiacSigns = [
  { name: 'Aries', description: 'Aries is the spark that ignites the zodiac, a bold pioneer charging forward like a ram breaking through barriers. Their energy is raw, direct, and unstoppable, inspiring others to take action and embrace new beginnings.' },
  { name: 'Taurus', description: 'Taurus is the fertile earth, steady and enduring, like a lush meadow basking in spring sunlight. Their patience and reliability create a foundation for growth, and their love of comfort is like a warm, inviting home.' },
  { name: 'Gemini', description: 'Gemini is the playful breeze, quick and ever-changing, like a pair of birds darting through the sky. Their curiosity and wit connect ideas and people, weaving a tapestry of conversation and discovery.' },
  { name: 'Cancer', description: 'Cancer is the gentle tide, nurturing and protective, like the moonlit waves that cradle the shore. Their intuition and care create a safe harbor for loved ones, and their emotions ebb and flow with the lunar cycle.' },
  { name: 'Leo', description: 'Leo is the radiant sun, shining with confidence and warmth, like a lion basking in golden light. Their creativity and generosity inspire admiration, and their presence commands the stage of life.' },
  { name: 'Virgo', description: 'Virgo is the meticulous gardener, tending to every detail with care, like a field of wheat ready for harvest. Their analytical mind and helpful spirit bring order to chaos and nurture growth in others.' },
  { name: 'Libra', description: 'Libra is the balanced scale, seeking harmony and beauty, like a gentle breeze that brings peace to a restless world. Their diplomacy and sense of fairness create connections and restore equilibrium.' },
  { name: 'Scorpio', description: 'Scorpio is the deep well, mysterious and intense, like a river flowing beneath the surface. Their passion and resilience transform challenges into strength, and their loyalty runs as deep as the ocean.' },
  { name: 'Sagittarius', description: 'Sagittarius is the adventurous arrow, soaring toward distant horizons, like a wild horse galloping across open plains. Their optimism and thirst for knowledge inspire journeys of both mind and spirit.' },
  { name: 'Capricorn', description: 'Capricorn is the steadfast mountain, climbing patiently toward the summit, like an ancient tree rooted in rocky soil. Their discipline and ambition build lasting legacies and withstand the test of time.' },
  { name: 'Aquarius', description: 'Aquarius is the visionary wind, carrying new ideas across the world, like a lightning storm electrifying the night sky. Their originality and humanitarian spirit spark progress and unite communities.' },
  { name: 'Pisces', description: 'Pisces is the boundless ocean, flowing with empathy and imagination, like a dreamer drifting between worlds. Their compassion and artistry dissolve boundaries and connect all living things.' }
];


export class SignsDatabase {
  private pdo: any;

  constructor(pdo?: any) {
    this.pdo = pdo || connection;
  }

  async setup() {
    for (const sql of signsSqlStatements) {
      try {
        await this.pdo.query(sql);
      } catch (error: any) {
        Logger.error(error);
        console.error("Error setting up signs/user_charts tables:", error.message || error);
      }
    }
  }

  async insertZodiacSigns() {
    try {
      for (const sign of zodiacSigns) {
        await this.pdo.query(
          'INSERT  INTO signs (name, description) VALUES (?, ?)',
          [sign.name, sign.description]
        );
      }
      console.log("Zodiac signs with descriptions inserted/ensured in DB.");
    } catch (error: any) {
      Logger.error(error);
      console.error("Error inserting zodiac signs:", error.message || error);
    }
  }
  

  async init() {
    try {
      await this.setup();
      await this.insertZodiacSigns(); // <-- Ensure zodiac signs are present
      console.log("Signs and user_charts tables initialized successfully.");
    } catch (error: any) {
      Logger.error(error);
      console.error("Error initializing signs/user_charts tables:", error.message || error);
    }
  }
}
