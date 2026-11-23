-- Payment service migration 003 (owner: ดิว)
-- Real car purchases are paid in several pieces, not one card swipe:
--   payment_type   BOOKING_DEPOSIT (เงินจอง), DOWN_PAYMENT (เงินดาวน์),
--                  BALANCE (ชำระยอด), FINANCE_DISBURSEMENT (ไฟแนนซ์โอนยอดจัด)
--   payment_method + FINANCE: Finance records the loan amount the finance company
--                  transferred to the showroom (reference = contract no.).
--   finance_company  name of the finance company (FINANCE only).
-- Old rows become BALANCE. Safe to run again (columns are added only if missing).
-- Rollback (local only):
--   ALTER TABLE payments DROP COLUMN finance_company, DROP COLUMN payment_type;
--   ALTER TABLE payments MODIFY payment_method ENUM('CASH','BANK_TRANSFER','CREDIT_CARD') NOT NULL;
ALTER TABLE payments
  MODIFY payment_method ENUM('CASH','BANK_TRANSFER','CREDIT_CARD','FINANCE') NOT NULL;

SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    "ALTER TABLE payments ADD COLUMN payment_type ENUM('BOOKING_DEPOSIT','DOWN_PAYMENT','BALANCE','FINANCE_DISBURSEMENT') NOT NULL DEFAULT 'BALANCE' AFTER payment_method",
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_type'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE payments ADD COLUMN finance_company VARCHAR(150) NULL AFTER transaction_reference',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'finance_company'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
