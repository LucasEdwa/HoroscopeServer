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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
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

  async init() {
    try {
      await this.setup();
      console.log("Signs and user_charts tables initialized successfully.");
    } catch (error: any) {
      Logger.error(error);
      console.error("Error initializing signs/user_charts tables:", error.message || error);
    }
  }
}
