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
        table: "sessions",
        client: null, // an existing cassandra client
        clientOptions: { // if no client give config - https://github.com/datastax/nodejs-driver
            contactPoints: [ "localhost" ],
            keyspace: "tests",
            queryOptions: {
                "prepare": true
            }
        }
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
        this.table = this.client.keyspace + "." + options.table;
        delete options.client;
        delete options.clientOptions;
        delete options.table;
        delete options.keyspace;
        debug("Database configuration: ", JSON.stringify(this.clientOptions, null, 0));
        debug("Database table: ", this.table);
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

    /**
     * Inherit from `Store`.
     */
    CassandraStore.prototype.__proto__ = Store.prototype;

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {string} sid
     * @param {function} callback
     * @api public
     */
    CassandraStore.prototype.get = function (sid, callback)
    {
        var query = "SELECT session FROM " + this.table + " WHERE sid=?";
        var qParams = [sid];
        debug("Query: %s", query);
        debug("Query params: %s", qParams);
        var self = this;
        this.client.execute(query, qParams, this.clientOptions.queryOptions,
            function (error, result)
        {
            var session = null;
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
                        if (result.rows.length > 0 && result.rows[0]["session"])
                        {
                            var expires = result.rows[0]["expires"];
                            if (expires && expires <= Date.now()) {
                                self.destroy(sid, function(err){
                                    if(err){
                                        debug("Error destroying expired session");
                                    }
                                });
                            }
                            else{
                                session = JSON.parse(result.rows[0]["session"]);
                            }
                        }
                    }
                    debug("Session %s obtained", JSON.stringify(sess, null, 0));
                }
                catch (err)
                {
                    debug("Session %s cannot be parsed: %s", sid, err.message);
                }
            }
            return callback(error, session);
        });
    };

    /**
     * Commit the given `session` object associated with the given `sid`.
     *
     * @param {string} sid
     * @param {Object} sess
     * @param {function} callback
     * @api public
     */
    CassandraStore.prototype.set = function (sid, sess, callback)
    {
        var session = JSON.stringify(sess, null, 0);
        var expires = new Date(Date.now() + sess.cookie.maxAge);
        var query = "INSERT INTO " + this.table + " (sid, session, expires, expired) VALUES (?,?,?,?);";
        var qParams = [sid, session, expires, false];
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
                debug("Insert/update session: %s", JSON.stringify(result, null, 0));
            }
            return callback(error, result);
        });
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {string} sid
     * @param {function} callback
     * @api public
     */
    CassandraStore.prototype.destroy = function (sid, callback)
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
            return callback(error, result);
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
        var query = "SELECT session FROM " + this.table + " WHERE expired=false ALLOW FILTERING;";
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
                        result.rows.forEach(function (row)
                        {
                            if (row["session"])
                            {
                                sessions.push(JSON.parse(row["session"]));
                            }
                        });
                    }
                }
                debug("Select result: %s", JSON.stringify(result, null, 0));
            }
            return callback(error, sessions)
        });
    };
    /**
     * Delete all sessions from the store.
     *
     * @param {function} callback
     * @api public
     */
    CassandraStore.prototype.clear = function (callback)
    {
        var query = "TRUNCATE " + this.table + ";";
        debug("Query: %s", query);
        this.client.execute(query, this.clientOptions.queryOptions,
        function (error, result)
        {
            if (error)
            {
                debug("Sessions cannot be deleted: %s", error);
            }
            else
            {
                debug("Session deleted");
            }
            return callback(error);
        });
    };
    /**
     * "touch" a given session given a session ID.
     *
     * @param {string} sid
     * @param {session} session
     * @param {function} callback
     * @api public
     */
    CassandraStore.prototype.touch = function (sid, session, callback)
    {
        var self = this;
        this.get(sid, function(error, currentSession){
            if (currentSession) {
                // update expiration
                currentSession.cookie = session.cookie;
                self.set(sid, currentSession, function(err, res){
                    return callback(err);
                });
            }
            else{
                return callback(error);
            }
        });
    };

    return CassandraStore;
};