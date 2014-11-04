cassandra-store
===============

Implementation of the session storage in Apache Cassandra as express middleware.

## Installation

```
$ npm install cassandra-store
```

## Options

- `contactPoints`: [ "host1", "host2" ]
- `keyspace`: "tests"
- `protocolOptions`: JSON object `{ "port": 9042 }`

For example:

```
{
    "contactPoints": [ "localhost" ],
    "keyspace": "tests",
    "protocolOptions": {
        "port": 9042
    },
    "authProvider": {
        "username": "",
        "password": ""
    }
}
```

Other options come from the Cassandra client driver directly.
See: http://www.datastax.com/documentation/developer/nodejs-driver/1.0/common/drivers/reference/clientOptions.html

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
