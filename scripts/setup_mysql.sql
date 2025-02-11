-- Drop user if exists to avoid conflicts
DROP USER IF EXISTS 'forex_user'@'localhost';
DROP USER IF EXISTS 'forex_user'@'%';

-- Create user with proper password
CREATE USER 'forex_user'@'localhost' IDENTIFIED BY 'DBPASSWORD';
CREATE USER 'forex_user'@'%' IDENTIFIED BY 'DBPASSWORD';

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS forex_db;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'localhost';
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show the created user and their privileges
SELECT user, host FROM mysql.user WHERE user = 'forex_user';
SHOW GRANTS FOR 'forex_user'@'localhost';

-- Switch to the forex database
USE forex_db;

-- Create forex_events table
CREATE TABLE IF NOT EXISTS forex_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time DATETIME NOT NULL,
    currency VARCHAR(10) NOT NULL,
    impact VARCHAR(20) NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    forecast VARCHAR(50),
    previous VARCHAR(50),
    actual VARCHAR(50),
    url VARCHAR(255),
    source VARCHAR(50),
    ai_summary TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    is_updated BOOLEAN DEFAULT FALSE,
    INDEX idx_time (time),
    INDEX idx_currency (currency),
    INDEX idx_impact (impact)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_email_preferences table
CREATE TABLE IF NOT EXISTS user_email_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    daily_notifications_enabled BOOLEAN DEFAULT FALSE,
    daily_notification_time TIME,
    weekly_notifications_enabled BOOLEAN DEFAULT FALSE,
    weekly_notification_day INT,
    weekly_notification_time TIME,
    selected_currencies JSON,
    selected_impact_levels JSON,
    timezone VARCHAR(50) NOT NULL,
    last_notification_sent DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 