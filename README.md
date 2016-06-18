cassandra-store
===============

Implementation of the session storage in [Apache Cassandra](https://cassandra.apache.org/)
as an extension of the [express-session middleware](https://github.com/expressjs/session).
This version has been fully updated to ES6 and Node.js >= 6.0.0. For backwards
compatibility, use older versions of the package.

## Installation

```console
$ npm install [-g] cassandra-store
```

## Options

```
{
    table: "sessions",
    client: null, // an existing cassandra client
    clientOptions: {
        contactPoints: [ "localhost" ],
        keyspace: "tests",
        queryOptions: {
            "prepare": true
        }
    }
};
```

Client options come from the [Cassandra client driver](http://docs.datastax.com/en/drivers/nodejs/3.0/) (version 3.x).

## Configuring the database

To create the table in the Cassandra database, you need the execute the
following CQL commands:

```
USE tests;

DROP TABLE IF EXISTS sessions;

CREATE TABLE IF NOT EXISTS sessions (
   sid text,
   session text,
   expires timestamp,
   PRIMARY KEY(sid)
);
```

## Debugging

To activate debugging, set the environment variable `NODE_DEBUG`:

```console
$ export NODE_DEBUG=cassandra-store
```

## Usage

Usage within express:

```javascript
const session = require("express-session");
const CassandraStore = require("cassandra-store");

app.use(session({
    store: new CassandraStore(options),
    ...
}));
```

## Major changes

- Updated to ES6 and Node.js >= 6.0.0
- Removed dependencies on external packages uuid and debug