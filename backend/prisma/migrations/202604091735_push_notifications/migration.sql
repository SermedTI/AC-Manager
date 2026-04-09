-- Create tables used for technician push notifications

CREATE TABLE "device_push_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_notification_events" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "maintenance_record_id" TEXT,
  "target_user_id" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "processing_started_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "push_notification_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_push_tokens_token_key"
  ON "device_push_tokens"("token");

CREATE INDEX "device_push_tokens_user_id_active_idx"
  ON "device_push_tokens"("user_id", "active");

CREATE UNIQUE INDEX "push_notification_events_event_type_maintenance_record_id_key"
  ON "push_notification_events"("event_type", "maintenance_record_id");

CREATE INDEX "push_notification_events_delivered_at_processing_started_at_created_at_idx"
  ON "push_notification_events"("delivered_at", "processing_started_at", "created_at");

ALTER TABLE "device_push_tokens"
  ADD CONSTRAINT "device_push_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_notification_events"
  ADD CONSTRAINT "push_notification_events_maintenance_record_id_fkey"
  FOREIGN KEY ("maintenance_record_id") REFERENCES "maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enqueue_new_order_push_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'SCHEDULED' THEN
    INSERT INTO "push_notification_events" (
      "id",
      "event_type",
      "maintenance_record_id",
      "target_user_id",
      "title",
      "body",
      "created_at"
    )
    VALUES (
      gen_random_uuid()::text,
      'NEW_ORDER',
      NEW.id,
      NEW.performed_by_id,
      CASE
        WHEN NEW.performed_by_id IS NULL THEN 'Nova OS disponivel'
        ELSE 'Nova OS atribuida'
      END,
      COALESCE(NULLIF(trim(NEW.title), ''), 'Verifique a fila de ordens no aplicativo.'),
      now()
    )
    ON CONFLICT ("event_type", "maintenance_record_id") DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_records_enqueue_push_notification
  AFTER INSERT ON "maintenance_records"
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_new_order_push_event();
