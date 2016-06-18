# Tests

Define the cassandra host location in an environment variable:

```console
$ export DBHOST=cassandra.example.org
```

Other client properties that refer to other keyspace or table that are
not the default ones shall be updated in the test file.