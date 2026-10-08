-- Run once for an existing database before enabling manual reminder actions.
-- Existing first-send timestamps are preserved.
BEGIN;

ALTER TABLE public.appointment
  DROP CONSTRAINT IF EXISTS appointment_reminder_status_check;

UPDATE public.appointment SET reminder_status = 'sent' WHERE reminder_status = 'send';

ALTER TABLE public.appointment
  ADD CONSTRAINT appointment_reminder_status_check
  CHECK (reminder_status IN ('pending', 'sent', 'failed'));

COMMENT ON COLUMN public.appointment.reminder_sent_at IS
  'Bangkok local time of the first recorded manual reminder action; preserved on repeated clicks.';

COMMIT;
