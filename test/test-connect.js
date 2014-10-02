var assert = require('assert');
var session = require('express-session');
var CassandraStore = require('../index')(session);
var uuid = require('node-uuid');
var debug = require('debug')('connect:cassandra-test');

var dbOptions = {
    "version": "3.1.0",
    "hosts": [ "webcc-db.fit.fraunhofer.de" ],
    "keyspace": "imergo_tests",
    "username": "",
    "password": "",
    "staleTime": 10000,
    "maxRequests": 16,
    "maxRequestsRetry": 10,
    "maxExecuteRetries": 5,
    "connectTimeout": 5000,
    "getAConnectionTimeout": 60000,
    "poolSize": 1
};
var store = new CassandraStore(dbOptions);
var testSession = {
    cookie: {
        maxAge: 2000
    },
    name: 'tj'
};
var testSessionId = "pre-"+ uuid.v4();
debug('testSessionId %s', testSessionId);
    // #set()
    store.set(testSessionId, testSession, function(err, ok){
        debug("store.setstore.setstore.set ");
        assert.ok(!err, '#set() got an error');
        assert.ok(ok, '#set() is not ok');
        // #get()
        store.get(testSessionId, function(err, data){
            assert.ok(!err, '#get() got an error');
            assert.deepEqual({ cookie: { maxAge: 2000 }, name: 'tj' }, data);

            // #set null
            store.set('123', { cookie: { maxAge: 2000 }, name: 'tj' }, function(){
                store.destroy('123', function(){
                    debug('done');
                    process.exit(0);
                });
            });
        });
    });



process.once('uncaughtException', function (err) {
    debug(err);
    //assert.ok(err.message === 'Error in fn', '#get() catch wrong error');

});