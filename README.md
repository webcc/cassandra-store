cassandra-store
===============

Implementation of the session storage in Apache Cassandra as express middleware.

Installation
------------

```
$ npm install --save cassandra-store
```

Usage
-----

Usage within express:

```
const session = require("express-session");
const CassandraStore = require("cassandra-store");

app.use(session({
    store: new CassandraStore(options),
    ...
}));
```

Options
-------

```
{
    table: "sessions",
    client: null, // an existing cassandra client
    clientOptions: { // more https://github.com/datastax/nodejs-driver
        contactPoints: [ "localhost" ],
        keyspace: "sessions_store"
    }
};
```

Notes:

-	If no `options.client` is supplied a new one is created using `options.clientOptions`
-	If the client does not have a keyspace configured you must include it in the table name: `table: "sessions_store.sessions"`

Configuring the database
------------------------

To create the table in the Cassandra database, you need the execute the following CQL commands:

```
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
```

Test
====

```
# Export Cassandra host address
export DBHOST=cassandra.example.org

# Initialize schema
cqlsh -f ./cql/create.cql

# Run tests with
npm test
```
