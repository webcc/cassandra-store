"use strict";

describe("cassandra-store", function ()
{
    const assert = require("assert");
    const cassandra = require("cassandra-driver");
    const CassandraStore = require("..");

    const id = cassandra.types.TimeUuid.now().toString();
    const options = {
        table: "sessions",
        clientOptions: {
            contactPoints: (process.env.DBHOST || "localhost").split(","),
            keyspace: "tests"
        }
    };
    const testSession = {
        "cookie": {
            "path": "/",
            "httpOnly": true,
            "secure": true,
            "maxAge": 600000
        },
        "name": "sid"
    };
    let store = undefined;
    before("should prepare default empty store with new client", (done) =>
    {
        store = new CassandraStore(options, (err, res) =>
        {
            assert.strictEqual(err, null);
            store.clear((err1) =>
            {
                assert.strictEqual(err1, null);
                done();
            });
        });
    });
    it("should test the default store", () =>
    {
        assert(typeof store.client === "object");
        assert.strictEqual(store.client.keyspace, options.clientOptions.keyspace);
        assert.strictEqual(store.table, `${options.table}`);
    });
    it("should init a store with a custom client", (done) =>
    {
        const customClient = new cassandra.Client(options.clientOptions);
        const opts = {
            client: customClient,
            clientOptions: {
                contactPoints: (process.env.DBHOST || "localhost").split(","),
                keyspace: "tests"
            }
        };
        const store2 = new CassandraStore(opts, (err, res) =>
        {
            assert.strictEqual(err, null);
            assert.strictEqual(typeof store2.client, "object");
            assert.strictEqual(store2.client.keyspace, opts.clientOptions.keyspace);
            assert.strictEqual(store2.table, "sessions");
            done();
        });
    });
    it("should set a session", function (done)
    {
        store.set(id, testSession, function (error)
        {
            assert.strictEqual(error, null);
            done();
        });
    });
    it("should get an existing session", function (done)
    {
        store.get(id, function (error, session)
        {
            assert.strictEqual(error, null);
            assert.deepEqual(session, testSession);
            done();
        });
    });
    it("should get null for a non existing session", function (done)
    {
        const id2 = cassandra.types.TimeUuid.now().toString();
        store.get(id2, function (error, session)
        {
            assert.strictEqual(error, null);
            assert.strictEqual(session, null);
            done();
        });
    });
    it("should get all existing sessions", function (done)
    {
        store.all(function (error, sessions)
        {
            assert.strictEqual(error, null);
            assert.strictEqual(sessions.length, 1);
            assert.deepEqual(sessions[0], testSession);
            done();
        });
    });
    it("should get correct length of existing db sessions", function (done)
    {
        store.length(function (error, length)
        {
            assert.strictEqual(error, null);
            assert.strictEqual(length, 1);
            done();
        });
    });
    it("should touch an existing session", function (done)
    {
        const newSession = {
            "cookie": {
                "path": "/",
                "httpOnly": true,
                "secure": true,
                "maxAge": 1200000
            },
            "name": "sid"
        };
        store.touch(id, newSession, function (error)
        {
            assert.strictEqual(error, null);
            store.get(id, function (err, session)
            {
                assert.strictEqual(err, null);
                assert.deepEqual(session, newSession);
                done();
            });
        });
    });
    it("should destroy an existing session", function (done)
    {
        store.destroy(id, function (error)
        {
            assert.strictEqual(error, null);
            store.length(function (err, length)
            {
                assert.strictEqual(error, null);
                assert.strictEqual(length, 0);
                done();
            });
        });
    });
});