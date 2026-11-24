-- TOYOTY configurator: trims (Eco / Balanced / High Performance), paint colours, wheels and
-- the made-to-order production queue. Run AFTER 01/02 schema + 03_catalog_columns.sql,
-- then run 08_seed_toyoty.sql.
--
-- Safe to run more than once: tables / columns / keys are only created when missing.
-- Nothing is dropped. Old models are HIDDEN, not deleted (orders and appointments still
-- point at their cars with ON DELETE RESTRICT), and only on the first run.
-- Needs MySQL 8 (or MariaDB 10.5+). In Workbench run the whole file at once.
-- Railway: export a backup first. Rollback steps are in database/README.md.
SET NAMES utf8mb4;
USE carshop_sql;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_fk_if_missing;

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

CREATE PROCEDURE add_index_if_missing(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', cols, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE add_fk_if_missing(IN tbl VARCHAR(64), IN fk VARCHAR(64), IN col VARCHAR(64), IN ref_tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND CONSTRAINT_NAME = fk
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fk, '` FOREIGN KEY (`', col,
      '`) REFERENCES `', ref_tbl, '`(id) ON DELETE RESTRICT ON UPDATE RESTRICT');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

-- 1 if car_models.is_active is new, i.e. this is the first run: only then hide the old models.
SET @first_run = (
  SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'car_models' AND COLUMN_NAME = 'is_active'
);

-- car_models: hide old brands, weekly production capacity of a model.
CALL add_column_if_missing('car_models', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL add_column_if_missing('car_models', 'weekly_capacity', 'SMALLINT UNSIGNED NOT NULL DEFAULT 5');

-- Shared option lists. `code` is the stable key used by the web page and Sales.
CREATE TABLE IF NOT EXISTS paint_colors (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(50) NOT NULL,
  hex CHAR(7) NOT NULL,
  finish ENUM('SOLID','METALLIC','PEARL','SPECIAL') NOT NULL DEFAULT 'SOLID',
  price_extra DECIMAL(14,2) NOT NULL DEFAULT 0,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_paint_colors_code (code),
  CHECK (price_extra >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wheel_options (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(80) NOT NULL,
  size_inch TINYINT UNSIGNED NOT NULL,
  image_path MEDIUMTEXT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_wheel_options_code (code)
) ENGINE=InnoDB;

-- One model has three trims. Trim price = price of the model in that trim.
CREATE TABLE IF NOT EXISTS car_trims (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  car_model_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  code ENUM('ECO','BALANCED','HIGH_PERFORMANCE') NOT NULL,
  name VARCHAR(50) NOT NULL,
  tagline VARCHAR(150) NULL,
  price DECIMAL(14,2) NOT NULL,
  engine VARCHAR(150) NULL,
  horsepower INT UNSIGNED NULL,
  fuel_economy_kml DECIMAL(4,1) NULL,
  transmission VARCHAR(100) NULL,
  fuel VARCHAR(50) NULL,
  features JSON NULL,
  parts_lead_days SMALLINT UNSIGNED NOT NULL DEFAULT 14,
  default_wheel_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_car_trims_model_code (car_model_id, code),
  CONSTRAINT fk_car_trims_model FOREIGN KEY (car_model_id) REFERENCES car_models(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_car_trims_default_wheel FOREIGN KEY (default_wheel_id) REFERENCES wheel_options(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK (price >= 0)
) ENGINE=InnoDB;

-- Which colours a trim may have (+ the photo of the car in that colour).
CREATE TABLE IF NOT EXISTS trim_colors (
  trim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  color_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  image_path MEDIUMTEXT NULL,
  PRIMARY KEY (trim_id, color_id),
  CONSTRAINT fk_trim_colors_trim FOREIGN KEY (trim_id) REFERENCES car_trims(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_trim_colors_color FOREIGN KEY (color_id) REFERENCES paint_colors(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- Which wheels a trim may have. The same wheel can cost a different amount per trim.
CREATE TABLE IF NOT EXISTS trim_wheels (
  trim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  wheel_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  price_extra DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (trim_id, wheel_id),
  CONSTRAINT fk_trim_wheels_trim FOREIGN KEY (trim_id) REFERENCES car_trims(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_trim_wheels_wheel FOREIGN KEY (wheel_id) REFERENCES wheel_options(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK (price_extra >= 0)
) ENGINE=InnoDB;

-- Weekly build queue per model. week_start is a Monday. A missing row means
-- "capacity = car_models.weekly_capacity, nothing booked yet".
CREATE TABLE IF NOT EXISTS production_slots (
  car_model_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  week_start DATE NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  booked SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (car_model_id, week_start),
  CONSTRAINT fk_production_slots_model FOREIGN KEY (car_model_id) REFERENCES car_models(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- cars: the spec that was ordered + where the car is in production.
-- cars.color keeps the colour NAME so Sales / Payment / NOVA can show it as before;
-- cars.price is the total at order time (snapshot), price_breakdown the lines behind it.
CALL add_column_if_missing('cars', 'trim_id', 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL');
CALL add_column_if_missing('cars', 'paint_color_id', 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL');
CALL add_column_if_missing('cars', 'wheel_id', 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL');
CALL add_column_if_missing('cars', 'price_breakdown', 'JSON NULL');
-- NULL = an ordinary stock / showroom car. Made-to-order cars always have a value.
CALL add_column_if_missing('cars', 'production_status', "ENUM('QUOTED','SCHEDULED','IN_PRODUCTION','IN_TRANSIT','READY','DELIVERED') NULL");
CALL add_column_if_missing('cars', 'build_week', 'DATE NULL');
CALL add_column_if_missing('cars', 'eta_from', 'DATE NULL');
CALL add_column_if_missing('cars', 'eta_to', 'DATE NULL');
-- eta_to promised when the queue was booked; compare with eta_to to see a delay.
CALL add_column_if_missing('cars', 'first_eta_to', 'DATE NULL');
CALL add_column_if_missing('cars', 'ready_date', 'DATE NULL');
CALL add_fk_if_missing('cars', 'fk_cars_trim', 'trim_id', 'car_trims');
CALL add_fk_if_missing('cars', 'fk_cars_paint_color', 'paint_color_id', 'paint_colors');
CALL add_fk_if_missing('cars', 'fk_cars_wheel', 'wheel_id', 'wheel_options');
CALL add_index_if_missing('cars', 'idx_cars_production', '`production_status`, `build_week`');

-- Remembers what the first run hid, so the old catalog can be brought back (see README).
CREATE TABLE IF NOT EXISTS legacy_hidden_cars (
  car_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  previous_status ENUM('AVAILABLE','RESERVED','SOLD','INACTIVE') NOT NULL,
  hidden_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- First run only: hide every model that is not TOYOTY (the 15 demo models and any added
-- by hand) and take their AVAILABLE cars off sale. RESERVED / SOLD cars and every order,
-- invoice and policy that uses them stay exactly as they are.
INSERT IGNORE INTO legacy_hidden_cars (car_id, previous_status)
  SELECT c.id, c.status FROM cars c JOIN car_models m ON m.id = c.car_model_id
  WHERE @first_run = 1 AND m.brand <> 'TOYOTY' AND c.status = 'AVAILABLE';
UPDATE cars c JOIN legacy_hidden_cars h ON h.car_id = c.id
  SET c.status = 'INACTIVE'
  WHERE @first_run = 1 AND c.status = 'AVAILABLE';
UPDATE car_models SET is_active = 0 WHERE @first_run = 1 AND brand <> 'TOYOTY';

DROP PROCEDURE add_column_if_missing;
DROP PROCEDURE add_index_if_missing;
DROP PROCEDURE add_fk_if_missing;

SELECT IF(@first_run = 1, 'first run: old models hidden', 'already migrated: nothing hidden') AS result,
  (SELECT COUNT(*) FROM car_models WHERE is_active = 1) AS active_models,
  (SELECT COUNT(*) FROM car_models WHERE is_active = 0) AS hidden_models;
