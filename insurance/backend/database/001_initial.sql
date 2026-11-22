CREATE TABLE IF NOT EXISTS insurance_plans (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  insurance_type VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  premium_amount DECIMAL(12,2) NOT NULL,
  coverage JSON NOT NULL,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS insurance_purchases (
  id CHAR(36) PRIMARY KEY,
  plan_id CHAR(36) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  car_brand VARCHAR(80) NOT NULL,
  car_model VARCHAR(100) NOT NULL,
  car_year SMALLINT NOT NULL,
  registration_number VARCHAR(30) NULL,
  source VARCHAR(20) NOT NULL,
  client_request_id CHAR(36) NOT NULL UNIQUE,
  original_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  final_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_insurance_purchase_plan FOREIGN KEY (plan_id) REFERENCES insurance_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS insurance_policies (
  id CHAR(36) PRIMARY KEY,
  purchase_id CHAR(36) NOT NULL UNIQUE,
  policy_number VARCHAR(60) NOT NULL UNIQUE,
  receipt_token_hash CHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_insurance_policy_purchase FOREIGN KEY (purchase_id) REFERENCES insurance_purchases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
