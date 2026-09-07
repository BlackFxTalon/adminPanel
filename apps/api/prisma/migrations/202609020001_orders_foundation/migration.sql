BEGIN;

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE contragent_kind AS ENUM ('company', 'contact');
CREATE TYPE order_status AS ENUM ('pending_approval', 'in_work', 'cargo_in_transit', 'awaiting_payment', 'completed', 'cancelled');

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, email)
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL,
  token_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ(3) NOT NULL,
  revoked_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX auth_sessions_user_id_family_id_idx ON auth_sessions(user_id, family_id);

CREATE TABLE contragents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind contragent_kind NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, organization_id)
);
CREATE INDEX contragents_organization_id_display_name_idx ON contragents(organization_id, display_name);

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contragent_id TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  tax_id TEXT,
  UNIQUE (id, organization_id),
  UNIQUE (contragent_id, organization_id),
  FOREIGN KEY (contragent_id, organization_id) REFERENCES contragents(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contragent_id TEXT NOT NULL UNIQUE,
  company_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  UNIQUE (id, organization_id),
  UNIQUE (contragent_id, organization_id),
  FOREIGN KEY (contragent_id, organization_id) REFERENCES contragents(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, organization_id) REFERENCES companies(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contragent_id TEXT,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, number),
  FOREIGN KEY (contragent_id, organization_id) REFERENCES contragents(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  contragent_id TEXT NOT NULL,
  offer_id TEXT,
  responsible_user_id TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending_approval',
  currency CHAR(3) NOT NULL DEFAULT 'RUB',
  total_minor BIGINT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, number),
  CONSTRAINT orders_currency_check CHECK (currency = 'RUB'),
  CONSTRAINT orders_total_minor_check CHECK (total_minor >= 0),
  FOREIGN KEY (contragent_id, organization_id) REFERENCES contragents(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (offer_id, organization_id) REFERENCES offers(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (responsible_user_id, organization_id) REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX orders_organization_id_created_at_idx ON orders(organization_id, created_at);
CREATE INDEX orders_organization_id_status_idx ON orders(organization_id, status);
CREATE INDEX orders_organization_id_contragent_id_idx ON orders(organization_id, contragent_id);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_minor BIGINT NOT NULL,
  amount_minor BIGINT NOT NULL,
  characteristics TEXT,
  weight_grams INTEGER,
  volume_cubic_centimeters INTEGER,
  UNIQUE (order_id, position),
  CONSTRAINT order_items_position_check CHECK (position > 0),
  CONSTRAINT order_items_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_minor_check CHECK (unit_price_minor >= 0),
  CONSTRAINT order_items_amount_minor_check CHECK (amount_minor = quantity::BIGINT * unit_price_minor),
  CONSTRAINT order_items_weight_grams_check CHECK (weight_grams IS NULL OR weight_grams >= 0),
  CONSTRAINT order_items_volume_check CHECK (volume_cubic_centimeters IS NULL OR volume_cubic_centimeters >= 0),
  FOREIGN KEY (order_id, organization_id) REFERENCES orders(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX order_items_organization_id_order_id_idx ON order_items(organization_id, order_id);

COMMIT;
