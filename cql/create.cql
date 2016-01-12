USE tests;

DROP TABLE IF EXISTS express_session;

CREATE TABLE IF NOT EXISTS express_session (
   sid text,
   session text,
   expires timestamp,
   PRIMARY KEY (sid)
);