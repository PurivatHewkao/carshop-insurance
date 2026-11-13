-- Payment service migration 002 (owner: ดิว)
-- "ติดต่อการเงิน": a seller sends a note about one of their orders to Finance,
-- Finance replies and closes it. Used by /seller/finance and /admin/finance.
-- Adds one table only. Rollback (local only): DROP TABLE finance_requests;
CREATE TABLE IF NOT EXISTS finance_requests (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  topic VARCHAR(100) NOT NULL,
  message VARCHAR(500) NOT NULL,
  status ENUM('OPEN','DONE') NOT NULL DEFAULT 'OPEN',
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reply VARCHAR(500) NULL,
  replied_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  replied_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_finance_requests_status_created (status, created_at, id),
  INDEX idx_finance_requests_order (order_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;
