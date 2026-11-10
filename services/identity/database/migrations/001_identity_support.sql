CREATE TABLE IF NOT EXISTS identity_revoked_tokens (
  jti CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  expires_at BIGINT UNSIGNED NOT NULL,
  INDEX idx_revoked_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS identity_admin_lock (
  id TINYINT PRIMARY KEY
) ENGINE=InnoDB;
INSERT IGNORE INTO identity_admin_lock (id) VALUES (1);
