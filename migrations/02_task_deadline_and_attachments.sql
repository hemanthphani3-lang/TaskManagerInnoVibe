-- 02_task_deadline_and_attachments.sql
-- Add deadline (DATE) and attachment_urls (JSONB) to tasks table.
-- Preserve existing due_date and attachments for backward compatibility.

BEGIN;

ALTER TABLE tasks
  ADD COLUMN deadline DATE,
  ADD COLUMN attachment_urls JSONB;

-- Copy existing due_date to deadline
UPDATE tasks SET deadline = due_date WHERE due_date IS NOT NULL;

-- Migrate existing attachments (TEXT[] of URLs) to JSONB objects [{name, url}]
UPDATE tasks SET attachment_urls = (
  SELECT jsonb_agg(jsonb_build_object(
    'name', regexp_replace(url, '^.*/', ''),
    'url', url
  ))
  FROM unnest(attachments) AS url
) WHERE attachments IS NOT NULL;

-- Optional indexes
CREATE INDEX idx_tasks_deadline ON tasks (deadline);
CREATE INDEX idx_tasks_attachment_urls ON tasks USING gin (attachment_urls);

-- Enable Realtime for tasks tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;

COMMIT;
