-- Push notifications for technicians via Firebase Cloud Messaging.
-- Compatible with the current production schema driven by Prisma enums.

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS "Role"
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

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_notification_events (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type            TEXT NOT NULL,
  maintenance_record_id TEXT REFERENCES maintenance_records(id) ON DELETE CASCADE,
  target_user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  body                  TEXT NOT NULL,
  attempt_count         INTEGER NOT NULL DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  last_error            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_type, maintenance_record_id)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_active
  ON device_push_tokens(user_id, active);

CREATE INDEX IF NOT EXISTS idx_push_notification_events_pending
  ON push_notification_events(delivered_at, processing_started_at, created_at);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON device_push_tokens TO authenticated;

DROP POLICY IF EXISTS "device_push_tokens_read_own" ON device_push_tokens;
DROP POLICY IF EXISTS "device_push_tokens_insert_technician" ON device_push_tokens;
DROP POLICY IF EXISTS "device_push_tokens_update_technician" ON device_push_tokens;
DROP POLICY IF EXISTS "device_push_tokens_delete_own" ON device_push_tokens;

CREATE POLICY "device_push_tokens_read_own" ON device_push_tokens
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "device_push_tokens_insert_technician" ON device_push_tokens
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id
    AND current_user_role() = 'TECHNICIAN'::"Role"
  );

CREATE POLICY "device_push_tokens_update_technician" ON device_push_tokens
  FOR UPDATE USING (
    auth.uid()::text = user_id
    AND current_user_role() = 'TECHNICIAN'::"Role"
  )
  WITH CHECK (
    auth.uid()::text = user_id
    AND current_user_role() = 'TECHNICIAN'::"Role"
  );

CREATE POLICY "device_push_tokens_delete_own" ON device_push_tokens
  FOR DELETE USING (auth.uid()::text = user_id);

DROP TRIGGER IF EXISTS maintenance_records_enqueue_push_notification ON maintenance_records;

CREATE OR REPLACE FUNCTION enqueue_new_order_push_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'SCHEDULED'::"MaintenanceStatus" THEN
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
