-- Adds the columns the web catalog needs. Run AFTER 01_mysql_schema.sql.
-- Safe to run more than once: a column / index is only created when it is missing.
-- Nothing is dropped and existing data is kept.
-- Needs MySQL 8 (or MariaDB 10.5+). In Workbench run the whole file at once.
USE carshop_sql;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_unique_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(IN tbl VARCHAR(64), IN col VARCHAR(64), IN definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE add_unique_if_missing(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN col VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD UNIQUE KEY `', idx, '` (`', col, '`)');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

-- car_models: details shown on the car list / detail pages.
CALL add_column_if_missing('car_models', 'slug', 'VARCHAR(120) NULL');
CALL add_column_if_missing('car_models', 'tag', 'VARCHAR(50) NULL');
CALL add_column_if_missing('car_models', 'featured', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL add_column_if_missing('car_models', 'variant', 'VARCHAR(100) NULL');
CALL add_column_if_missing('car_models', 'engine', 'VARCHAR(150) NULL');
CALL add_column_if_missing('car_models', 'horsepower', 'INT UNSIGNED NULL');
CALL add_column_if_missing('car_models', 'transmission', 'VARCHAR(100) NULL');
CALL add_column_if_missing('car_models', 'drive', 'VARCHAR(100) NULL');
CALL add_column_if_missing('car_models', 'fuel', 'VARCHAR(50) NULL');
CALL add_column_if_missing('car_models', 'seats', 'TINYINT UNSIGNED NULL');
CALL add_column_if_missing('car_models', 'location', 'VARCHAR(150) NULL');
CALL add_column_if_missing('car_models', 'warranty', 'VARCHAR(255) NULL');
CALL add_column_if_missing('car_models', 'features', 'JSON NULL');
CALL add_column_if_missing('car_models', 'color_options', 'JSON NULL');
CALL add_unique_if_missing('car_models', 'uq_car_models_slug', 'slug');

-- promotions: text shown on the promotion cards.
CALL add_column_if_missing('promotions', 'badge', 'VARCHAR(50) NULL');
CALL add_column_if_missing('promotions', 'subtitle', 'VARCHAR(200) NULL');
CALL add_column_if_missing('promotions', 'offer_text', 'VARCHAR(200) NULL');
CALL add_column_if_missing('promotions', 'conditions', 'TEXT NULL');
CALL add_column_if_missing('promotions', 'applies_to', 'VARCHAR(200) NULL');
CALL add_column_if_missing('promotions', 'image_url', 'MEDIUMTEXT NULL');

-- Photos can be uploaded files (data: URLs), which do not fit in VARCHAR(2048).
ALTER TABLE car_images MODIFY image_path MEDIUMTEXT NOT NULL;

DROP PROCEDURE add_column_if_missing;
DROP PROCEDURE add_unique_if_missing;

SELECT 'car_models' AS tbl, COUNT(*) AS columns_now FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_models'
UNION ALL
SELECT 'promotions', COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions';
