"use strict";

/**
 * Return the `cassandraStore` extending `express`' session Store.
 *
 * @param {Object} session
 * @return {function}
 * @api public
 */
module.exports = function (session)
{
    /**
     * Dependencies.
     */
    var util = require("util");
    var cassandra = require("cassandra-driver");
    var debug = require("debug")("cassandra-store");
    /**
     * Default variables.
     */

    var defaultOptions = {
        keyspace: "tests",
        table: "sessions",
        client: null, // an existing cassandra client
        clientOptions: { // more https://github.com/datastax/nodejs-driver
            contactPoints: [ "localhost" ],
            queryOptions: {
                "prepare": true
            }
        }
        // session options: https://github.com/expressjs/session
    };

    /**
     * Express' session Store.
     */
    var Store = session.Store;

    /**
     * Initialize CassandraStore with the given `options`.
     *
     * @param {Object} config
     * @api public
     */
    function CassandraStore(options)
    {
        this.clientOptions = Object.assign({}, defaultOptions.clientOptions, options.clientOptions);
        delete options.clientOptions;
        if (options.client)
        {
            this.client = options.client;
            debug("Database client found.");

        }
        else
        {
            this.client = new cassandra.Client(this.clientOptions);
            debug("Database client not found, created.");
        }
        this.table = options.keyspace + "." + options.table;
        delete options.client;
        delete options.clientOptions;
        delete options.table;
        delete options.keyspace;
        debug("Database configuration: ", JSON.stringify(this.clientOptions, null, 0));
        debug("Database table: ", this.table);
        if(this.client)
        {
            Store.call(this, options);
            this.options = options;
            this.client.on("log", function(level, className, message, furtherInfo)
            {
                debug("%s [%s]: %s (%s)", className, level, message, furtherInfo);
            });
            this.client.connect(function (error)
            {
                if (error)
                {
                    debug("Database not available: " + error.message);
                    throw error;
                }
                else
                {
                    debug("Database store initialized");
                }
            });
        }
        else
        {
            debug("Cassandra client undefined. Session not initiated.");
            throw new Error("Cassandra client undefined");
        }

    }

    /**
     * Inherit from `Store`.
     */
    CassandraStore.prototype.__proto__ = Store.prototype;

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {string} sid
     * @param {function} fn
     * @api public
     */
    CassandraStore.prototype.get = function (sid, fn)
    {
        var query = "SELECT sobject FROM " + this.table + " WHERE sid=?";
        var qParams = [sid];
        debug("Query: %s", query);
        debug("Query params: %s", qParams);
        this.client.execute(query, qParams, this.clientOptions.queryOptions,
            function (error, result)
        {
            var sess = null;
            if (error)
            {
                debug("Session %s cannot be fetched: %s", sid, error);
            }
            else
            {
                debug("Session %s fetched", sid);
                debug("Select result: %s", JSON.stringify(result, null, 0));
                try
                {
                    if (result && result.rows)
                    {
                        if (result.rows.length > 0 && result.rows[0]["sobject"])
                        {
                            sess = JSON.parse(result.rows[0]["sobject"]);
                        }
                    }
                    debug("Session %s obtained", JSON.stringify(sess, null, 0));
                }
                catch (err)
                {
                    debug("Session %s cannot be parsed: %s", sid, err.message);
                }
            }
            return fn(error, sess);
        });
    };

    /**
     * Commit the given `session` object associated with the given `sid`.
     *
     * @param {string} sid
     * @param {Object} sess
     * @param {function} fn
     * @api public
     */
    CassandraStore.prototype.set = function (sid, sess, fn)
    {
        var sobject = JSON.stringify(sess, null, 0);
        var ttl = Math.round(sess.cookie.maxAge / 1000);
        var query = "UPDATE " + this.table + " USING TTL " + ttl + " SET sobject=? WHERE sid=?;";
        var qParams = [sobject, sid];
        debug("Query: %s", query);
        this.client.execute(query, qParams, this.clientOptions.queryOptions,
            function (error, result)
        {
            if (error)
            {
                debug("Session %s cannot be created: %s", sid, error);
            }
            else
            {
                debug("Session %s added", sid);
                debug("Update result: %s", JSON.stringify(result, null, 0));
            }
            return fn(error, result);
        });
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {string} sid
     * @param {function} fn
     * @api public
     */
    CassandraStore.prototype.destroy = function (sid, fn)
    {
        var query = "DELETE FROM " + this.table + " WHERE sid=?;";
        var qParams = [sid];
        debug("Query: %s", query);
        debug("qParams: %s", qParams);
        this.client.execute(query, qParams, this.clientOptions.queryOptions,
            function (error, result)
        {
            if (error)
            {
                debug("Session %s cannot be deleted: %s", sid, error);
            }
            else
            {
                debug("Session %s deleted", sid);
                debug("Delete result: %s", JSON.stringify(result, null, 0));
            }
            return fn(error, result);
        });
    };

    /**
     * Attempt to fetch all sessions.
     *
     * @param {function} callback
     * @api public
     */
    CassandraStore.prototype.all = function (callback)
    {
        var query = "SELECT sobject FROM " + this.table + ";";
        var qParams = [];
        debug("Query: %s", query);
        debug("Query params: %s", qParams);
        this.client.execute(query, qParams, this.clientOptions.queryOptions,
        function (error, result)
        {
            var sessions = [];
            if (error)
            {
                debug("Sessions cannot be fetched: %s", error);
            }
            else
            {
                if (result && result.rows)
                {
                    debug("Sessions fetched", result.rows.length);
                    if (result.rows.length > 0)
                    {
                        sessions = result.rows;
                    }
                }
                debug("Select result: %s", JSON.stringify(result, null, 0));
            }
            return callback(error, sessions)
        });
    };

    return CassandraStore;
};