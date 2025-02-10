-- Update root user to allow remote connections
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'DBPASSWORD';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- Update forex_user for remote connections
DROP USER IF EXISTS 'forex_user'@'localhost';
DROP USER IF EXISTS 'forex_user'@'%';
CREATE USER 'forex_user'@'%' IDENTIFIED BY 'UltraFX#736';
GRANT ALL PRIVILEGES ON forex_db.* TO 'forex_user'@'%';
FLUSH PRIVILEGES;

-- Verify the user privileges
SELECT user, host FROM mysql.user WHERE user IN ('root', 'forex_user');
SHOW GRANTS FOR 'forex_user'@'%'; 