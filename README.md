cassandra-store
===============

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][npm-downloads]][npm-url]
![Node][node-version]

Implementation of the session storage in [Apache Cassandra][cassandra]
as an extension of the [express-session middleware][express-session].
This version has been fully updated to ES6 and Node.js >= 6.0.0. For backwards
compatibility, use older versions of the package.

## Installation

```shell
$ npm install [-g] cassandra-store
```

## Options

```json
{
    "table": "sessions",
    "client": null,
    "clientOptions": {
        "contactPoints": [ "localhost" ],
        "keyspace": "tests",
        "queryOptions": {
            "prepare": true
        }
    }
}
```

If `client` is `null` or undefined, a new Cassandra client will be created.
Client options come from the [Cassandra client driver][cassandra-driver] (version 3.x).

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

```shell
$ export NODE_DEBUG=cassandra-store
```

## Testing

See [test/README.md](test/README.md)

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

[cassandra]: https://cassandra.apache.org/
[cassandra-driver]: http://docs.datastax.com/en/drivers/nodejs/3.0/
[express-session]: https://github.com/expressjs/session
[node-version]: https://img.shields.io/badge/node-6.0.0-orange.svg?style=flat-square
[npm-image]: https://img.shields.io/badge/npm-4.1.4-blue.svg?style=flat-square
[npm-downloads]: https://img.shields.io/badge/downloads-12k-red.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/cassandra-store