USE imergo_tests;

DROP TABLE sessions;

CREATE TABLE IF NOT EXISTS sessions (
   sid text PRIMARY KEY,
   sobject text
);
