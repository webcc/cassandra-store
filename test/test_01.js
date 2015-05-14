"use strict";

describe("cassandra-store", function()
{
    var assert = require("assert");
    var debug = require("debug")("cassandra-store");
    var session = require("express-session");
    var uuid = require("cassandra-driver").types.TimeUuid;
    var CassandraStore = require("../lib/cassandra-store")(session);
    var id = uuid.now();
    var options = require("./config/cassandra.json");
    options.contactPoints = [ process.env.DBHOST || options.contactPoints[0] ];
    var store = new CassandraStore(options);
    var testSession =
    {
        "cookie":
        {
            "path" : "/",
            "httpOnly" : true,
            "secure": true,
            "maxAge" : 600000
        },
        "name": "sid"
    };
    describe("#set", function()
    {
        before(function(done)
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
        it("should get an existing session", function(done)
        {
            store.get(id, function (error, session)
            {
                if(error)
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
        it("should destroy an existing session", function(done)
        {
            store.destroy(id, function (error, result)
            {
                if(error)
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
});