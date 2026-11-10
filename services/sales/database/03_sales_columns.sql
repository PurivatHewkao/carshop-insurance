-- Adds the columns the Sales pages need on `orders`. Run AFTER 01_mysql_schema.sql.
-- Safe to run more than once: a column / foreign key is only created when missing.
-- Nothing is dropped and existing rows are kept (they become PENDING_APPROVAL).
-- Needs MySQL 8 (or MariaDB 10.5+). In Workbench run the whole file at once.
--
-- Why: the Sales UI sells a car together with an insurance plan and has a
-- manager approval step with a comment, but `orders` had no place for them.
--   insurance_id / insurance_premium  chosen plan + premium snapshot at order time
--   approval_status / manager_comment manager decision (orders.status keeps the
--                                     order lifecycle: APPROVED -> CONFIRMED,
--                                     REJECTED -> CANCELLED, which frees the car)
--   note                              seller's note on the order
-- orders.subtotal = car price + insurance premium (snapshot); total = subtotal - discount.
USE carshop_sql;

DROP PROCEDURE IF EXISTS add_column_if_missing;
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

CREATE PROCEDURE add_fk_if_missing(IN tbl VARCHAR(64), IN fk VARCHAR(64), IN col VARCHAR(64), IN ref_tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl
      AND CONSTRAINT_NAME = fk AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fk, '` FOREIGN KEY (`', col,
      '`) REFERENCES `', ref_tbl, '`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL add_column_if_missing('orders', 'insurance_id', 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL');
CALL add_column_if_missing('orders', 'insurance_premium', 'DECIMAL(14,2) NOT NULL DEFAULT 0');
CALL add_column_if_missing('orders', 'approval_status', "ENUM('PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL'");
CALL add_column_if_missing('orders', 'manager_comment', 'TEXT NULL');
CALL add_column_if_missing('orders', 'note', 'TEXT NULL');
CALL add_fk_if_missing('orders', 'fk_orders_insurance', 'insurance_id', 'insurances');

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_fk_if_missing;

SHOW COLUMNS FROM orders;
