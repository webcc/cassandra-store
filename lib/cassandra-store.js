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
    var _ = require("underscore");
    var cassandra = require("cassandra-driver");
    var debug = require("debug")("cassandra-store");
    var Queries = require("./queries");

    /**
     * Default variables.
     */
    var TABLE = "sessions";
    var defaultOptions = {
        "contactPoints": [ "localhost" ],
        "keyspace": "tests",
        "protocolOptions": {
            "port": 9042
        },
        "socketOptions": {
            "connectTimeout": 5000
        },
        "queryOptions": {
            "fetchSize": 5000,
            "autoPage": true,
            "prepare": true
        },
        "authProvider": {
            "username": "",
            "password": ""
        }
    };

    /**
     * Express' session Store.
     */
    var Store = session.Store;

    /**
     * Initialize CassandraStore with the given `options`.
     *
     * @param {Object} options
     * @api public
     */
    function CassandraStore(options)
    {
        options = _.extend(defaultOptions, options);
        Store.call(this, options);
        this.options = options;
        this.client = new cassandra.Client(options);
        if(this.options.keyspace)
        {
            TABLE = this.options.keyspace + "." + TABLE;
        }
        debug("Database configuration: ", JSON.stringify(this.options, null, 0));
        debug("Database table: ", TABLE);
        this.client.on("log", function(level, className, message, furtherInfo)
        {
            debug("%s [%s]: %s (%s)", className, level, message, furtherInfo);
        });
        this.client.connect(function (error)
        {
            if (error)
            {
                debug("Database not available: " + error.message);
            }
            else
            {
                debug("Database store initialized");
            }
        });
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
        var query = util.format(Queries.SELECT, TABLE, sid);
        debug("Query: %s", query);
        this.client.execute(query, this.options.queryOptions,
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
        var query = util.format(Queries.UPDATE, TABLE,
            Math.round(sess.cookie.maxAge / 1000), sobject, sid);
        debug("Query: %s", query);
        this.client.execute(query, this.options.queryOptions,
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
        var query = util.format(Queries.DELETE, TABLE, sid);
        debug("Query: %s", query);
        this.client.execute(query, this.options.queryOptions,
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

    return CassandraStore;
};