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
- `client`: Cassandra client. For compatibility, the client must expose the same functionality as the [driver](https://github.com/datastax/nodejs-driver) (version 2.x).
- `table`: ColumnFamily in which the sessions are stored. Default: `"sessions"`

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
    },
    "table": "sessions"
}
```

Other options come from the [Cassandra client driver](https://docs.datastax.com/en/developer/nodejs-driver/2.2/nodejs-driver/whatsNew.html) (version 2.x).


## Configuring the database

To use the store with it's default configuration, you need the create the table in the Cassandra database, by executing the following CQL:

```
CREATE TABLE sessions (
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

Usage within express and custom client:

```
var session = require("express-session");
var CassandraStore = require("cassandra-store")(session);

var myClient = require('<my-client>');

app.use(session({
    store: new CassandraStore({
        client: myClient
    }),
    ...
}));
```
