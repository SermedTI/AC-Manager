-- ============================================================
-- Supabase Schema: camada publica operacional do app mobile
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- Enums (Supabase usa tipos custom do Postgres)
CREATE TYPE equipment_status AS ENUM (
  'OPERATIONAL',
  'NEEDS_MAINTENANCE',
  'BROKEN',
  'DEACTIVATED'
);
CREATE TYPE maintenance_type AS ENUM (
  'PREVENTIVE',
  'CORRECTIVE',
  'CLEANING'
);
CREATE TYPE maintenance_status AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);
CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'REQUESTER', 'VIEWER');

-- ============================================================
-- Tabelas
-- ============================================================

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  role       user_role NOT NULL DEFAULT 'TECHNICIAN',
  active     BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT,
  city       TEXT,
  state      TEXT,
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE equipment (
  id            TEXT PRIMARY KEY,
  tag           TEXT UNIQUE NOT NULL,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  serial_number TEXT,
  btu_capacity  INTEGER,
  type          TEXT,
  install_date  TIMESTAMPTZ,
  location      TEXT,
  status        equipment_status NOT NULL DEFAULT 'OPERATIONAL',
  notes         TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  unit_id       TEXT NOT NULL REFERENCES units(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_records (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  type            maintenance_type NOT NULL,
  status          maintenance_status NOT NULL DEFAULT 'SCHEDULED',
  scheduled_date  TIMESTAMPTZ NOT NULL,
  completed_date  TIMESTAMPTZ,
  cost            DECIMAL(10, 2),
  notes           TEXT,
  equipment_id    TEXT NOT NULL REFERENCES equipment(id),
  performed_by_id TEXT REFERENCES users(id),
  requested_by_id TEXT REFERENCES users(id),
  plan_id         TEXT,
  synced          BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_name             TEXT NOT NULL,
  file_url              TEXT NOT NULL,
  file_type             TEXT NOT NULL,
  file_size             INTEGER NOT NULL,
  equipment_id          TEXT REFERENCES equipment(id),
  maintenance_record_id TEXT REFERENCES maintenance_records(id),
  synced                BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device_push_tokens (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE push_notification_events (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type            TEXT NOT NULL,
  maintenance_record_id TEXT REFERENCES maintenance_records(id) ON DELETE CASCADE,
  target_user_id        TEXT,
  title                 TEXT NOT NULL,
  body                  TEXT NOT NULL,
  attempt_count         INTEGER NOT NULL DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  last_error            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_type, maintenance_record_id)
);

-- ============================================================
-- Indices
-- ============================================================

CREATE INDEX idx_maintenance_records_synced
  ON maintenance_records(synced) WHERE synced = false;
CREATE INDEX idx_maintenance_records_performed_by
  ON maintenance_records(performed_by_id);
CREATE INDEX idx_maintenance_records_requested_by
  ON maintenance_records(requested_by_id);
CREATE INDEX idx_maintenance_records_status
  ON maintenance_records(status);
CREATE INDEX idx_equipment_unit ON equipment(unit_id);
CREATE INDEX idx_attachments_synced
  ON attachments(synced) WHERE synced = false;
CREATE INDEX idx_device_push_tokens_user_active
  ON device_push_tokens(user_id, active);
CREATE INDEX idx_push_notification_events_pending
  ON push_notification_events(delivered_at, processing_started_at, created_at);

-- Realtime: permitir notificacoes de novas OS no app mobile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'maintenance_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_records;
  END IF;
END;
$$;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_events ENABLE ROW LEVEL SECURITY;

-- Politica: service_role (usado pelo sync job) tem acesso total
-- Essas politicas usam a role do JWT do Supabase

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM users
  WHERE id = auth.uid()::text
    AND active = true
$$;

GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

-- Usuarios autenticados leem apenas o proprio perfil
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Todos os usuarios do app podem ler unidades e equipamentos ativos
CREATE POLICY "units_read_all" ON units
  FOR SELECT USING (active = true);

CREATE POLICY "equipment_read_all" ON equipment
  FOR SELECT USING (active = true);

-- Tecnicos/Admins podem ler OS abertas ou atribuidas a si
CREATE POLICY "maintenance_read_technician_scope" ON maintenance_records
  FOR SELECT USING (
    current_user_role() IN ('ADMIN', 'TECHNICIAN')
    AND (performed_by_id = auth.uid()::text OR performed_by_id IS NULL)
  );

-- Solicitantes podem ler apenas as proprias OS
CREATE POLICY "maintenance_read_requester_scope" ON maintenance_records
  FOR SELECT USING (requested_by_id = auth.uid()::text);

-- Atualizacao direta so nas OS atribuidas ao tecnico logado
CREATE POLICY "maintenance_update_technician_scope" ON maintenance_records
  FOR UPDATE USING (
    current_user_role() IN ('ADMIN', 'TECHNICIAN')
    AND performed_by_id = auth.uid()::text
  )
  WITH CHECK (
    current_user_role() IN ('ADMIN', 'TECHNICIAN')
    AND performed_by_id = auth.uid()::text
  );

-- Anexos apenas em OS relacionadas ao usuario atual
CREATE POLICY "attachments_insert_related" ON attachments
  FOR INSERT WITH CHECK (
    maintenance_record_id IN (
      SELECT id
      FROM maintenance_records
      WHERE performed_by_id = auth.uid()::text
         OR requested_by_id = auth.uid()::text
    )
  );

CREATE POLICY "attachments_read_related" ON attachments
  FOR SELECT USING (
    maintenance_record_id IN (
      SELECT id
      FROM maintenance_records
      WHERE performed_by_id = auth.uid()::text
         OR requested_by_id = auth.uid()::text
    )
  );

CREATE POLICY "device_push_tokens_read_own" ON device_push_tokens
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "device_push_tokens_insert_technician" ON device_push_tokens
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id
    AND current_user_role() = 'TECHNICIAN'
  );

CREATE POLICY "device_push_tokens_update_technician" ON device_push_tokens
  FOR UPDATE USING (
    auth.uid()::text = user_id
    AND current_user_role() = 'TECHNICIAN'
  )
  WITH CHECK (
    auth.uid()::text = user_id
    AND current_user_role() = 'TECHNICIAN'
  );

CREATE POLICY "device_push_tokens_delete_own" ON device_push_tokens
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================
-- Trigger: marcar synced=false quando app alterar uma OS
-- ============================================================

CREATE OR REPLACE FUNCTION mark_unsynced()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    NEW.synced := false;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_records_mark_unsynced
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION mark_unsynced();

CREATE OR REPLACE FUNCTION enqueue_new_order_push_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'SCHEDULED' THEN
    INSERT INTO push_notification_events (
      event_type,
      maintenance_record_id,
      target_user_id,
      title,
      body
    )
    VALUES (
      'NEW_ORDER',
      NEW.id,
      NEW.performed_by_id,
      CASE
        WHEN NEW.performed_by_id IS NULL THEN 'Nova OS disponivel'
        ELSE 'Nova OS atribuida'
      END,
      COALESCE(NULLIF(trim(NEW.title), ''), 'Verifique a fila de ordens no aplicativo.')
    )
    ON CONFLICT (event_type, maintenance_record_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_records_enqueue_push_notification
  AFTER INSERT ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_new_order_push_event();

-- ============================================================
-- RPCs publicas para o app mobile
-- ============================================================

CREATE OR REPLACE FUNCTION claim_order(p_order_id TEXT)
RETURNS maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record maintenance_records;
BEGIN
  IF current_user_role() NOT IN ('ADMIN', 'TECHNICIAN') THEN
    RAISE EXCEPTION 'Apenas tecnicos podem assumir OS';
  END IF;

  UPDATE maintenance_records
  SET performed_by_id = auth.uid()::text,
      updated_at = now()
  WHERE id = p_order_id
    AND performed_by_id IS NULL
    AND status = 'SCHEDULED'
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM maintenance_records WHERE id = p_order_id
    ) THEN
      RAISE EXCEPTION 'OS nao encontrada';
    END IF;

    RAISE EXCEPTION 'Esta OS ja foi assumida ou nao pode ser assumida';
  END IF;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION start_order(p_order_id TEXT)
RETURNS maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record maintenance_records;
BEGIN
  IF current_user_role() NOT IN ('ADMIN', 'TECHNICIAN') THEN
    RAISE EXCEPTION 'Apenas tecnicos podem iniciar OS';
  END IF;

  UPDATE maintenance_records
  SET status = 'IN_PROGRESS',
      updated_at = now()
  WHERE id = p_order_id
    AND performed_by_id = auth.uid()::text
    AND status = 'SCHEDULED'
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A OS nao esta disponivel para inicio';
  END IF;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION complete_order(
  p_order_id TEXT,
  p_notes TEXT DEFAULT NULL,
  p_cost NUMERIC DEFAULT NULL
)
RETURNS maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record maintenance_records;
BEGIN
  IF current_user_role() NOT IN ('ADMIN', 'TECHNICIAN') THEN
    RAISE EXCEPTION 'Apenas tecnicos podem concluir OS';
  END IF;

  UPDATE maintenance_records
  SET status = 'COMPLETED',
      completed_date = now(),
      notes = p_notes,
      cost = p_cost,
      updated_at = now()
  WHERE id = p_order_id
    AND performed_by_id = auth.uid()::text
    AND status IN ('SCHEDULED', 'IN_PROGRESS')
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A OS nao esta disponivel para conclusao';
  END IF;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION create_request_order(
  p_equipment_id TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record maintenance_records;
BEGIN
  IF current_user_role() NOT IN ('ADMIN', 'REQUESTER') THEN
    RAISE EXCEPTION 'Apenas solicitantes podem abrir OS pelo app';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM equipment
    WHERE id = p_equipment_id
      AND active = true
  ) THEN
    RAISE EXCEPTION 'Equipamento nao encontrado';
  END IF;

  INSERT INTO maintenance_records (
    id,
    title,
    description,
    type,
    status,
    scheduled_date,
    equipment_id,
    requested_by_id,
    synced,
    updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    p_title,
    p_description,
    'CORRECTIVE',
    'SCHEDULED',
    now(),
    p_equipment_id,
    auth.uid()::text,
    false,
    now()
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION start_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_order(TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION create_request_order(TEXT, TEXT, TEXT) TO authenticated;
