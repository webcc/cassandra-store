DROP KEYSPACE IF EXISTS sessions_store;

CREATE KEYSPACE sessions_store WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': '1'
};

DROP TABLE IF EXISTS sessions_store.sessions;

CREATE TABLE IF NOT EXISTS sessions_store.sessions (
   sid text,
   session text,
   PRIMARY KEY (sid)
);
