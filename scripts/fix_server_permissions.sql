-- Drop existing user to clean up permissions
DROP USER IF EXISTS 'forex_user'@'localhost';

-- Create user specifically for localhost connection
CREATE USER 'forex_user'@'localhost' IDENTIFIED BY 'UltraFX#736';

-- Grant privileges
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Verify the permissions
SELECT user, host FROM mysql.user WHERE user = 'forex_user';
SHOW GRANTS FOR 'forex_user'@'localhost'; 