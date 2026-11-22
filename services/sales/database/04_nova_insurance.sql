-- Insurance: additive tables only, preserve orders.insurance_id and historical plans.
CREATE TABLE IF NOT EXISTS order_nova_insurance (
  order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  plan_id CHAR(36) NOT NULL,
  quote_token TEXT NOT NULL,
  plan_snapshot JSON NOT NULL,
  delivery_date DATE NOT NULL,
  customer_snapshot JSON NOT NULL,
  vehicle_snapshot JSON NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_PAYMENT',
  nova_request_id CHAR(36) NULL UNIQUE,
  policy_snapshot JSON NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  INDEX nova_dispatch (status, next_attempt_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
