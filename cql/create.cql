USE tests;

DROP TABLE IF EXISTS sessions;

CREATE TABLE IF NOT EXISTS sessions (
   sid text PRIMARY KEY,
   sobject text
);
