"use strict";
describe("cassandra-store", function ()
{
    var assert = require("assert");
    var debug = require("debug")("cassandra-store");
    var session = require("express-session");
    var cassandra = require("cassandra-driver");
    var uuid = require("uuid");
    var CassandraStore = require("../lib/cassandra-store")(session);
    var id = uuid.v1();
    var options = {
        table: "express_session",
        clientOptions: {
            contactPoints: [process.env.DBHOST || "localhost"],
            keyspace: "tests"
        }
    };
    var testSession = {
        "cookie": {
            "path": "/",
            "httpOnly": true,
            "secure": true,
            "maxAge": 600000
        },
        "name": "sid"
    };
    var store = null;
    it("should init a store from client config", function ()
    {
        store = new CassandraStore(options);
        assert(typeof store.client === "object");
        assert.equal(store.client.keyspace, options.clientOptions.keyspace);
    });
    it("should init a store with a custom client", function (done)
    {
        var customClient = new cassandra.Client(options.clientOptions);
        var opts = {
            table: "express_session",
            client: customClient
        };
        customClient.connect(function (error)
        {
            assert.equal(error, null);
            store = new CassandraStore(opts);
            assert(typeof store.client === "object");
            assert.equal(store.client.keyspace, options.clientOptions.keyspace);
            done();
        });
    });
    it("should set a session", function (done)
    {
        store.set(id, testSession, function (error, result)
        {
            assert.equal(error, null);
            done();
        });
    });
    it("should get an existing session", function (done)
    {
        store.get(id, function (error, session)
        {
            assert.equal(error, null);
            assert.deepEqual(session, testSession);
            done();
        });
    });
    it("should get all existing sessions", function (done)
    {
        store.all(function (error, sessions)
        {
            assert.equal(error, null);
            assert.equal(sessions.length, 1);
            assert.deepEqual(sessions[0], testSession);
            done();
        });
    });
    it("should destroy an existing session", function (done)
    {
        store.destroy(id, function (error, result)
        {
            assert.equal(error, null);
            assert.equal(error, undefined);
            done();
        });
    });
});