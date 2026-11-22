-- Which car (and optional custom picture) is shown on the cover (hero) of the home page and the /catalog page.
-- One row per slot. car_model_id NULL = automatic car, image_url NULL = use the car's own photo.
-- Run once on the catalog database (select it first, e.g. railway). Safe to re-run, also if the table already exists.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_covers (
  slot         VARCHAR(20) NOT NULL PRIMARY KEY,
  car_model_id VARCHAR(36) NULL,
  image_url    MEDIUMTEXT NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- table created by an earlier version of this file: add the picture column
SET @has_image := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_covers' AND COLUMN_NAME = 'image_url');
SET @ddl := IF(@has_image = 0, 'ALTER TABLE site_covers ADD COLUMN image_url MEDIUMTEXT NULL', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO site_covers (slot, car_model_id) VALUES ('home', NULL), ('catalog', NULL);
