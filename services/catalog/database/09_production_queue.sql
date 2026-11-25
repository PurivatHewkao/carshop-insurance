-- Production queue for made-to-order TOYOTY cars (owner: ดิว, Payment + production queue).
-- Run AFTER 01_mysql_schema.sql. Runs on the database you are connected to
-- (carshop_sql locally, railway on Railway) and is safe to run more than once:
-- nothing is dropped, existing rows are kept.
--
-- A car row is made-to-order when cars.production_status IS NOT NULL.
-- Stock cars keep production_status = NULL and behave exactly as before.
--   WAITING -> SCHEDULED -> IN_PRODUCTION -> IN_TRANSIT -> READY -> DELIVERED
--   (CANCELLED when the order is cancelled / fully refunded)
-- build_week   = Monday of the week the car is built (one production slot)
-- eta_from/to  = window shown to the customer; first_eta_to = the first promise,
--                used to measure delay (delay > 30 days -> customer may cancel with a full refund)

CREATE TABLE IF NOT EXISTS production_capacity (
  car_model_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  weekly_capacity SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (car_model_id) REFERENCES car_models(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CHECK (weekly_capacity <= 100)
) ENGINE=InnoDB;

-- cars: production columns (added together, only when missing).
SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    "ALTER TABLE cars
       ADD COLUMN production_status ENUM('QUOTED','WAITING','SCHEDULED','IN_PRODUCTION','IN_TRANSIT','READY','DELIVERED','CANCELLED') NULL,
       ADD COLUMN build_week DATE NULL,
       ADD COLUMN eta_from DATE NULL,
       ADD COLUMN eta_to DATE NULL,
       ADD COLUMN first_eta_to DATE NULL,
       ADD COLUMN ready_date DATE NULL,
       ADD COLUMN production_note VARCHAR(255) NULL,
       ADD INDEX idx_cars_production_week (car_model_id, build_week),
       ADD INDEX idx_cars_production_status (production_status)",
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'production_status'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Catalog 07_toyoty_configurator.sql (กร) also adds cars.production_status, with
-- QUOTED and without WAITING/CANCELLED, and has no production_note. Whichever file
-- runs first, end with the same columns: one ENUM that has every value both use.
SET @ddl = (
  SELECT IF(COUNT(*) = 1 AND MAX(COLUMN_TYPE) <> "enum('QUOTED','WAITING','SCHEDULED','IN_PRODUCTION','IN_TRANSIT','READY','DELIVERED','CANCELLED')",
    "ALTER TABLE cars MODIFY COLUMN production_status ENUM('QUOTED','WAITING','SCHEDULED','IN_PRODUCTION','IN_TRANSIT','READY','DELIVERED','CANCELLED') NULL",
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'production_status'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE cars ADD COLUMN production_note VARCHAR(255) NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'production_note'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE cars ADD INDEX idx_cars_production_week (car_model_id, build_week)',
    'SELECT 1')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cars' AND INDEX_NAME = 'idx_cars_production_week'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
