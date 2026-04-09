-- Incremental migration for existing Supabase projects
-- Adds REQUESTER role, requester-owned OS, and RPCs used by the mobile app.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'REQUESTER'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'REQUESTER';
  END IF;
END;
$$;

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS requested_by_id TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_requested_by
  ON maintenance_records(requested_by_id);

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

DROP POLICY IF EXISTS "maintenance_read_own" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update_own" ON maintenance_records;
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_read_own" ON attachments;
DROP POLICY IF EXISTS "maintenance_read_technician_scope" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_read_requester_scope" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_update_technician_scope" ON maintenance_records;
DROP POLICY IF EXISTS "attachments_insert_related" ON attachments;
DROP POLICY IF EXISTS "attachments_read_related" ON attachments;

CREATE POLICY "maintenance_read_technician_scope" ON maintenance_records
  FOR SELECT USING (
    current_user_role() IN ('ADMIN', 'TECHNICIAN')
    AND (performed_by_id = auth.uid()::text OR performed_by_id IS NULL)
  );

CREATE POLICY "maintenance_read_requester_scope" ON maintenance_records
  FOR SELECT USING (requested_by_id = auth.uid()::text);

CREATE POLICY "maintenance_update_technician_scope" ON maintenance_records
  FOR UPDATE USING (
    current_user_role() IN ('ADMIN', 'TECHNICIAN')
    AND performed_by_id = auth.uid()::text
  )
  WITH CHECK (
    current_user_role() IN ('ADMIN', 'TECHNICIAN')
    AND performed_by_id = auth.uid()::text
  );

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
