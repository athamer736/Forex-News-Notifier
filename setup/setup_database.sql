-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS forex_db;

-- Create user with access from both localhost and the specific hostname
CREATE USER IF NOT EXISTS 'forex_user'@'localhost' IDENTIFIED BY 'UltraFX#736';
CREATE USER IF NOT EXISTS 'forex_user'@'%.cable.virginm.net' IDENTIFIED BY 'UltraFX#736';

-- Grant privileges
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'localhost';
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'%.cable.virginm.net';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Use the database
USE forex_db;

-- Create tables and other setup as needed 