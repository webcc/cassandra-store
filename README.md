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
    keyspace: "tests",
    table: "sessions",
    client: null, // an existing cassandra client
    clientOptions: { // more https://github.com/datastax/nodejs-driver
        contactPoints: [ "localhost" ],
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
CREATE TABLE IF NOT EXISTS sessions (
   sid text PRIMARY KEY,
   sobject text
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
