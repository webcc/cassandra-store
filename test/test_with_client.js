"use strict";

describe("cassandra-store::WithClient", function ()
{
    var assert = require("assert");
    var debug = require("debug")("cassandra-store");
    var session = require("express-session");
    var cassandra = require("cassandra-driver");
    var uuid = require("uuid");
    var CassandraStore = require("../lib/cassandra-store")(session);
    var id = uuid.v1();
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
    before(function(done)
    {
        var customClient = new cassandra.Client({
            contactPoints: [process.env.DBHOST || "localhost"]
        });
        var options = {
            keyspace: "tests",
            table: "sessions",
            client: customClient
        };
        customClient.connect(function(error)
        {
            if(error)
            {
                debug("Error: %s", error);
            }
            else
            {
                store = new CassandraStore(options);
            }
            done();
        });
    });
    it("should set a session", function (done)
    {
        store.set(id, testSession, function (error, result)
        {
            if (error)
            {
                debug("Error: %s", error);
            }
            else
            {
                debug("Result: %s", JSON.stringify(result, null, 0));
            }
            done();
        });
    });
    it("should get an existing session", function (done)
    {
        store.get(id, function (error, session)
        {
            if (error)
            {
                debug("Error: %s", error);
            }
            else
            {
                debug("Session: %s", JSON.stringify(session, null, 0));
            }
            assert.deepEqual(session, testSession);
            done();
        });
    });
    it("should get all existing sessions", function (done)
    {
        store.all(function (error, sessions)
        {
            if (error)
            {
                debug("Error: %s", error);
            }
            else
            {
                assert.equal(sessions.length, 1);
                assert.deepEqual(sessions[0] , testSession);
            }
            done();
        });
    });
    it("should destroy an existing session", function (done)
    {
        store.destroy(id, function (error, result)
        {
            if (error)
            {
                debug(error.message);
            }
            else
            {
                debug(result);
            }
            assert.equal(error, undefined);
            done();
        });
    });
}); 