-- Insurance: additive partner workflow, separate from historical direct purchases.
CREATE TABLE IF NOT EXISTS nova_admins (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS nova_admin_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES nova_admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS nova_partner_requests (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL UNIQUE,
  payload_hash CHAR(64) NOT NULL,
  plan_snapshot JSON NOT NULL,
  customer JSON NOT NULL,
  vehicle JSON NOT NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  policy_number VARCHAR(60) NULL UNIQUE,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  approved_by CHAR(36) NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES nova_admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
