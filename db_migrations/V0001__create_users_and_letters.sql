
CREATE TABLE IF NOT EXISTS t_p93143336_gov_mail_site.users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p93143336_gov_mail_site.users (login, password, full_name)
VALUES ('Novikov', 'novikov123', 'Новиков')
ON CONFLICT (login) DO NOTHING;

CREATE TABLE IF NOT EXISTS t_p93143336_gov_mail_site.letters (
  id VARCHAR(50) PRIMARY KEY,
  tracking_number VARCHAR(20) UNIQUE NOT NULL,
  user_login VARCHAR(100) NOT NULL,
  sender_name VARCHAR(255),
  sender_address TEXT,
  sender_city VARCHAR(100),
  sender_zip VARCHAR(20),
  recipient_name VARCHAR(255),
  recipient_address TEXT,
  recipient_city VARCHAR(100),
  recipient_zip VARCHAR(20),
  letter_type VARCHAR(50),
  weight VARCHAR(50),
  status VARCHAR(100) DEFAULT 'Принято в отделении',
  created_at TIMESTAMP DEFAULT NOW()
);
