import { Logger } from './Logger';
import { connection } from '../database/connection'; // <-- use the shared connection

const userSqlStatements = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email varchar(249) COLLATE utf8mb4_unicode_ci NOT NULL,
    password varchar(255) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    username varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    status tinyint(2) unsigned NOT NULL DEFAULT '0',
    verified tinyint(1) unsigned NOT NULL DEFAULT '0',
    resettable tinyint(1) unsigned NOT NULL DEFAULT '1',
    roles_mask int(10) unsigned NOT NULL DEFAULT '0',
    registered int(10) unsigned NOT NULL,
    last_login int(10) unsigned DEFAULT NULL,
    force_logout mediumint(7) unsigned NOT NULL DEFAULT '0',
    PRIMARY KEY (id),
    UNIQUE KEY email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Users confirmations
  `CREATE TABLE IF NOT EXISTS users_confirmations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    email varchar(249) COLLATE utf8mb4_unicode_ci NOT NULL,
    selector varchar(16) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    token varchar(255) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    expires int(10) unsigned NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY selector (selector),
    KEY email_expires (email,expires),
    KEY user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Users remembered
  `CREATE TABLE IF NOT EXISTS users_remembered (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    selector varchar(24) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    token varchar(255) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    expires int(10) unsigned NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY selector (selector),
    KEY user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Users resets
  `CREATE TABLE IF NOT EXISTS users_resets (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    selector varchar(20) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    token varchar(255) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    expires int(10) unsigned NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY selector (selector),
    KEY user_id_expires (user_id,expires),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Users throttling
  `CREATE TABLE IF NOT EXISTS users_throttling (
    bucket varchar(44) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
    tokens float unsigned NOT NULL,
    replenished_at int(10) unsigned NOT NULL,
    expires_at int(10) unsigned NOT NULL,
    PRIMARY KEY (bucket),
    KEY expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // User details with birthdate and birthtime
  `CREATE TABLE IF NOT EXISTS user_details (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    birthdate DATE DEFAULT NULL,
    birthtime TIME DEFAULT NULL,
    birth_city VARCHAR(100) DEFAULT NULL,
    birth_country VARCHAR(100) DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

export class UserDatabase {
  private pdo: any;
  private auth: any;

  constructor(auth?: any) {
    this.pdo = connection; // always use the shared connection
    this.auth = auth;
  }

  getAuth() {
    return this.auth;
  }

  async setupUsers() {
    // Remove CREATE DATABASE and USE statements
    for (const sql of userSqlStatements) {
      try {
        await this.pdo.query(sql);
      } catch (error: any) {
        Logger.error(error);
        console.error("Error setting up users table:", error.message || error);
      }
    }
  }

  async init() {
    try {
      await this.setupUsers();
      console.log("User database initialized successfully.");
    } catch (error: any) {
      Logger.error(error);
      console.error("Error initializing user database:", error.message || error);
    }
  }
}