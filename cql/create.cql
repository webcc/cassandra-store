DROP KEYSPACE IF EXISTS sessions_store;

CREATE KEYSPACE sessions_store WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': '1'
};

CREATE TABLE sessions_store.sessions (
   sid text,
   session text,
   PRIMARY KEY (sid)
) WITH default_time_to_live = 3600; // 1 hour
