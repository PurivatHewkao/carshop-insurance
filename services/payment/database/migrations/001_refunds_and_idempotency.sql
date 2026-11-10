-- Payment service migration 001 (owner: ดิว)
-- Run AFTER "db schema/01_mysql_schema.sql", on the same database (carshop_sql):
--   mysql -u <user> -p carshop_sql < services/payment/database/migrations/001_refunds_and_idempotency.sql
-- Adds tables only. Does not change or drop anything in the shared schema.
-- Rollback (local only): DROP TABLE refunds; DROP TABLE payment_idempotency_keys;

-- Refund requests (proposed in the "API" tab of the Car Shop Google Doc; missing from the shared schema).
-- A request starts REQUESTED; Admin approves (-> REFUNDED) or rejects (-> REJECTED).
CREATE TABLE IF NOT EXISTS refunds (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('REQUESTED','REFUNDED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  requested_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  review_note VARCHAR(500) NULL,
  refund_reference VARCHAR(150) NULL UNIQUE,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  -- Only one open (REQUESTED) refund per payment at a time.
  open_payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (CASE WHEN status = 'REQUESTED' THEN payment_id ELSE NULL END) STORED,
  UNIQUE KEY uq_refunds_open_payment (open_payment_id),
  INDEX idx_refunds_order (order_id, created_at),
  INDEX idx_refunds_status_created (status, created_at, id),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK (amount > 0)
) ENGINE=InnoDB;

-- Idempotency-Key storage for POST /orders/{id}/payments and POST /payments/{id}/refunds.
-- A replay with the same key and body returns the stored response; a different body returns 422.
CREATE TABLE IF NOT EXISTS payment_idempotency_keys (
  scope VARCHAR(50) NOT NULL,
  idem_key VARCHAR(100) NOT NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  resource_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  status_code SMALLINT UNSIGNED NULL,
  response_body JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (scope, idem_key)
) ENGINE=InnoDB;
