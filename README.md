cassandra-store
===============

Implementation of the session storage in Apache Cassandra as express middleware.

## Installation

```
$ npm install cassandra-store
```

## Options

- `contactPoints`: [ "host1", "host2" ]
- `keyspace`: "DEFAULTKS"
- `protocolOptions`: JSON object `{ "port": 9042 }`

For example:

```
{
    "contactPoints": [ "cassandra.example.org" ],
    "keyspace": "DEFAULTKS",
    "protocolOptions": {
            "port": 9042
    }
}
```

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
