cassandra-store
===============

Implementation of the session storage in Apache Cassandra as express middleware.

## Installation

```
$ npm install cassandra-store
```

## Options

- `contactPoints` : [ "host1:port1", "host2:port2" ]
- `keyspace` : "DEFAULTKS"

Other options come from the Cassandra driver directly.

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
