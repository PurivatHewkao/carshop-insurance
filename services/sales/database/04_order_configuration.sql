-- Store the catalog selection and finance terms shown on a sales order.
-- Select the target schema before running (carshop_sql locally or railway on Railway).
-- Safe to rerun; existing orders remain valid.
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER //
CREATE PROCEDURE add_column_if_missing(IN tbl VARCHAR(64), IN col VARCHAR(64), IN definition TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;
CALL add_column_if_missing('orders', 'vehicle_configuration', 'JSON NULL');
CALL add_column_if_missing('orders', 'down_payment', 'DECIMAL(14,2) NULL');
CALL add_column_if_missing('orders', 'down_payment_percent', 'TINYINT UNSIGNED NULL');
CALL add_column_if_missing('orders', 'interest_rate', 'DECIMAL(6,3) NULL');
CALL add_column_if_missing('orders', 'installment_count', 'SMALLINT UNSIGNED NULL');
CALL add_column_if_missing('orders', 'installment_years', 'TINYINT UNSIGNED NULL');
CALL add_column_if_missing('appointments', 'vehicle_configuration', 'JSON NULL');
DROP PROCEDURE IF EXISTS add_column_if_missing;
