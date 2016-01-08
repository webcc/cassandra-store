cassandra-store
===============

Implementation of the session storage in Apache Cassandra as express middleware.

## Installation

```
$ npm install cassandra-store
```

## Options

```
{
    table: "sessions",
    client: null, // an existing cassandra client
    clientOptions: { // more https://github.com/datastax/nodejs-driver
        contactPoints: [ "localhost" ],
        keyspace: "tests",
        queryOptions: {
            "prepare": true
        }
    }
};
```

Other options come from the [Cassandra client driver](https://docs.datastax.com/en/developer/nodejs-driver/2.2/nodejs-driver/whatsNew.html) (version 2.x).

## Configuring the database

To create the table in the Cassandra database, you need the execute the
following CQL commands:

```
CREATE KEYSPACE tests
  WITH replication = {'class': 'SimpleStrategy', 'dataCenterName': 1};
CREATE TABLE IF NOT EXISTS express_session (
   sid text,
   session text,
   expires timestamp,
   expired boolean,
   PRIMARY KEY ((sid), expired, expires)
);
```

## Usage

Usage within express:

```
var session = require("express-session");
var CassandraStore = require("cassandra-store")(session);

app.use(session({
    store: new CassandraStore(options),
    ...
}));
```
