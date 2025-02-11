USE forex_db;

-- Check if columns exist before adding them
SET @dbname = 'forex_db';
SET @tablename = 'forex_events';

-- Check and add ai_summary column
SET @columnname = 'ai_summary';
SET @columnexists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

SET @sql = IF(
    @columnexists = 0,
    'ALTER TABLE forex_events ADD COLUMN ai_summary TEXT',
    'SELECT "ai_summary column already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add summary_generated_at column
SET @columnname = 'summary_generated_at';
SET @columnexists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
);

SET @sql = IF(
    @columnexists = 0,
    'ALTER TABLE forex_events ADD COLUMN summary_generated_at DATETIME',
    'SELECT "summary_generated_at column already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop index if it exists (ignore error if it doesn't exist)
DROP INDEX idx_has_summary ON forex_events;

-- Create new index
CREATE INDEX idx_has_summary ON forex_events (impact, currency, ai_summary(1));

-- Reset AI summaries for high-impact USD/GBP events
UPDATE forex_events 
SET ai_summary = NULL, summary_generated_at = NULL 
WHERE impact = 'High' AND currency IN ('USD', 'GBP'); 