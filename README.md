cassandra-store
===============

Implementation of the session storage in Apache Cassandra as express middleware.

## Installation

	  $ npm install cassandra-store

## Options

  - `version` : '3.1.0'
  - `hosts` : [ 'localhost' ]
  - `keyspace` : 'mykeyspace'
  - `username` : ``
  - `password` : ``,
  - `staleTime` : 10000,
  - `maxRequests` : 16,
  - `maxRequestsRetry `: 10,
  - `maxExecuteRetries` : 5,
  - `connectTimeout` : 5000,
  - `getAConnectionTimeout` : 60000,
  - `poolSize` : 1      
  - `ttl` Cassandra session TTL (expiration) in seconds

Any options not included in this list will be passed to Cassandra directly.

## Usage

Due to express `>= 4` changes, we now need to pass `express-session` to the function `connect-Cassandra` exports in order to extend `session.Store`:

    var session = require('express-session');
    var CassandraStore = require('cassandra-store')(session);

    app.use(session({
        store: new CassandraStore(options),
    }));
    
