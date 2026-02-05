-- Add audio fields to feedback_sessions and inline_comments tables
-- Run this migration with: sqlite3 feedback.db < migrations/001_add_audio_fields.sql

-- Add overall_feedback_audio_path to feedback_sessions
ALTER TABLE feedback_sessions ADD COLUMN overall_feedback_audio_path VARCHAR;

-- Add comment_audio_path to inline_comments
ALTER TABLE inline_comments ADD COLUMN comment_audio_path VARCHAR;
