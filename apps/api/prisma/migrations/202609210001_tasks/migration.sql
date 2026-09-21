BEGIN;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'open',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_id TEXT NOT NULL,
  contragent_id TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, number),
  CONSTRAINT tasks_title_check CHECK (length(btrim(title)) > 0),
  FOREIGN KEY (assignee_id, organization_id) REFERENCES users(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (contragent_id, organization_id) REFERENCES contragents(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id, organization_id) REFERENCES orders(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS tasks_organization_id_created_at_idx ON tasks(organization_id, created_at);
CREATE INDEX IF NOT EXISTS tasks_organization_id_status_idx ON tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS tasks_organization_id_assignee_id_idx ON tasks(organization_id, assignee_id);

COMMIT;
