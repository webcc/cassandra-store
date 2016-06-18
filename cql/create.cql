USE tests;

DROP TABLE IF EXISTS sessions;

CREATE TABLE IF NOT EXISTS sessions (
   sid text,
   session text,
   expires timestamp,
   PRIMARY KEY(sid)
);