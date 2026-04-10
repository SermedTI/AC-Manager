-- Enable realtime delivery for maintenance_records so the mobile app can
-- notify technicians about newly created work orders.

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
