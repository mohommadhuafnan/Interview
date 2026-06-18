-- Enable Supabase Realtime for live sessions
ALTER PUBLICATION supabase_realtime ADD TABLE interview_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE suspicious_events;
