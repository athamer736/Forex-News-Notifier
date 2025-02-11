-- Drop existing user to clean up permissions
DROP USER IF EXISTS 'forex_user'@'localhost';
DROP USER IF EXISTS 'forex_user'@'%';
DROP USER IF EXISTS 'forex_user'@'80.6.45.113';
DROP USER IF EXISTS 'forex_user'@'141.95.123.145';

-- Create user for all required hosts
CREATE USER 'forex_user'@'localhost' IDENTIFIED BY 'UltraFX#736';
CREATE USER 'forex_user'@'%' IDENTIFIED BY 'UltraFX#736';

-- Grant privileges
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'localhost';
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show the updated user permissions
SELECT user, host FROM mysql.user WHERE user = 'forex_user';
SHOW GRANTS FOR 'forex_user'@'localhost';
SHOW GRANTS FOR 'forex_user'@'%'; 