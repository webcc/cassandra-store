"use strict";

const debug = require("util").debuglog("cassandra-store");
const cassandra = require("cassandra-driver");
const Store = require("express-session").Store;

module.exports = class CassandraStore extends Store
{
    constructor(opts, callback)
    {
        super();
        this.clientOptions = Object.assign({
            contactPoints: [ "localhost" ],
            keyspace: "tests",
            queryOptions: { "prepare": true }
        }, opts.clientOptions);
        if (opts.client)
        {
            this.client = opts.client;
            debug("Cassandra database client found.");
        }
        else
        {
            this.client = new cassandra.Client(this.clientOptions);
            debug("Cassandra database client not found, created a new one.");
        }
        this.table = `${opts.table || "sessions"}`;
        debug(`Cassandra database configuration: ${JSON.stringify(this.clientOptions, null, 0)}`);
        debug(`Cassandra database table: ${this.table}`);
        this.client.on("log", (level, className, message, furtherInfo) =>
        {
            debug(`${className} [${level}]: ${message} (${furtherInfo})`);
        });
        if(typeof callback === "function")
        {
            this.client.connect(callback);
        }
        else
        {
            this.client.connect((error, result) =>
            {
                if (error)
                {
                    debug(`Cassandra database not available: ${error.message}`);
                    throw error;
                }
                else
                {
                    debug("Cassandra database store initialized.");
                    if(result)
                    {
                        debug(JSON.stringify(result, null, 0));
                    }
                }
            });
        }
    }

    get client()
    {
        return this._client;
    }
    set client(value)
    {
        this._client = value;
    }
    get clientOptions()
    {
        return this._clientOptions;
    }
    set clientOptions(value)
    {
        this._clientOptions = value;
    }
    get table()
    {
        return this._table;
    }
    set table(value)
    {
        this._table = value;
    }

    /**
     * Attempt to fetch all sessions.
     *
     * @param {function} callback
     * @api public
     */
    all(callback)
    {
        const query = `SELECT session FROM ${this.table} ALLOW FILTERING;`;
        const qParams = [];
        let sessions = [];
        debug(`Query: ${query}`);
        debug(`Query params: ${qParams}`);
        this.client.eachRow(query, qParams, this.clientOptions.queryOptions, (n, row) =>
        {
            debug(`Session [${n}] fetched: ${row}`);
            if (row["session"])
            {
                sessions.push(JSON.parse(row["session"]));
            }
        }, (error, result) =>
        {
            if (error)
            {
                debug(`Sessions cannot be fetched: ${error.message}`);
            }
            else
            {
                if (result && result.rows)
                {
                    debug(`Sessions fetched: ${result.rows.length}`);
                }
            }
            return callback(error, sessions)
        });
    }

    /**
     * Delete all sessions from the store.
     *
     * @param {function} callback
     * @api public
     */
    clear(callback)
    {
        const query = `TRUNCATE ${this.table};`;
        const qParams = [];
        debug(`Query: ${query}`);
        debug(`Query params: ${qParams}`);
        this.client.execute(query, this.clientOptions.queryOptions, (error, result) =>
        {
            if (error)
            {
                debug(`Sessions cannot be deleted: ${error.message}`);
            }
            else
            {
                debug(`All sessions deleted. Client result: ${JSON.stringify(result, null, 0)}`);
            }
            return callback(error);
        });
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {string} sid
     * @param {function} callback
     * @api public
     */
    destroy(sid, callback)
    {
        const query = `DELETE FROM ${this.table} WHERE sid=?;`;
        const qParams = [ sid ];
        debug(`Query: ${query}`);
        debug(`Query params: ${qParams}`);
        this.client.execute(query, qParams, this.clientOptions.queryOptions, (error, result) =>
        {
            if (error)
            {
                debug(`Session ${sid} cannot be deleted: ${error.message}`);
            }
            else
            {
                debug(`Session ${sid} deleted. Client result: ${JSON.stringify(result, null, 0)}`);
            }
            return callback(error);
        });
    };

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {string} sid
     * @param {function} callback
     * @api public
     */
    get(sid, callback)
    {
        const query = `SELECT session FROM ${this.table} WHERE sid=?;`;
        const qParams = [ sid ];
        debug(`Query: ${query}`);
        debug(`Query params: ${qParams}`);
        this.client.execute(query, qParams, this.clientOptions.queryOptions, (error, result) =>
        {
            let session = null;
            if (error)
            {
                debug(`Session ${sid} cannot be fetched: ${error.message}`);
            }
            else
            {
                debug(`Session ${sid} fetched.`);
                try
                {
                    if (result && result.rows)
                    {
                        if (result.rows.length && result.rows[0]["session"])
                        {
                            const expires = result.rows[0]["expires"];
                            if (expires && expires <= Date.now())
                            {
                                this.destroy(sid, (err, res) =>
                                {
                                    if(err)
                                    {
                                        debug(`Error deleting expired session at ${result.rows[0]["expires"]}.`);
                                    }
                                    else
                                    {
                                        debug(`Expired session at ${result.rows[0]["expires"]} deleted.`);
                                    }
                                });
                            }
                            else
                            {
                                session = JSON.parse(result.rows[0]["session"]);
                            }
                        }
                    }
                    debug("Session %s obtained", JSON.stringify(result.rows[0]["session"], null, 0));
                }
                catch (err)
                {
                    debug(`Session ${sid} cannot be parsed: ${err.message}`);
                }
            }
            return callback(error, session);
        });
    };

    /**
     * Get the count of all sessions in the store
     *
     * @param {function} callback
     * @api public
     */
    length(callback)
    {
        const query = `SELECT count(*) FROM ${this.table} ALLOW FILTERING;`;
        const qParams = [];
        debug(`Query: ${query}`);
        debug(`Query params: ${qParams}`);
        this.client.execute(query, qParams, this.clientOptions.queryOptions, (error, result) =>
        {
            let length = null;
            if (error)
            {
                debug(`Sessions cannot be fetched: ${error.message}`);
            }
            else
            {
                if (result && result.rows)
                {
                    if (result.rows.length)
                    {
                        length = result.rows[0]["count"].toNumber();
                    }
                }
                debug(`Length of active sessions: ${length}. Client result: ${JSON.stringify(result, null, 0)}`);
            }
            return callback(error, length)
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
    set(sid, sess, callback)
    {
        const session = JSON.stringify(sess, null, 0);
        const expires = new Date((new Date()).setMilliseconds(sess.cookie.maxAge));
        let ttl = parseInt(sess.cookie.maxAge / 1000);
        ttl = Number.isNaN(ttl) || ttl <= 0 ? 600 : ttl;
        const query = `INSERT INTO ${this.table} (sid, session, expires) VALUES (?, ?, ?) USING TTL ${ttl};`;
        const qParams = [ sid, session, expires ];
        debug(`Query: ${query}`);
        debug(`Query params: ${qParams}`);
        this.client.execute(query, qParams, this.clientOptions.queryOptions, (error, result) =>
        {
            if (error)
            {
                debug(`Session ${sid} cannot be created: ${error.message}`);
            }
            else
            {
                debug(`Session ${sid} added: ${JSON.stringify(sess, null, 0)}`);
                debug(`Client result: ${JSON.stringify(result, null, 0)}`);
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
    touch(sid, session, callback)
    {
        this.get(sid, (error, currentSession) =>
        {
            if (error)
            {
                debug(`Session ${sid} cannot be touched: ${error.message}`);
                return callback(error);
            }
            else if (currentSession === null)
            {
                const msg = `Session ${sid} cannot be found`;
                debug(msg);
                return callback(new Error(msg));
            }
            else
            {
                // update expiration
                currentSession.cookie = session.cookie;
                this.set(sid, currentSession, (err, res) =>
                {
                    if (err)
                    {
                        debug(`Session ${sid} cannot be touched: ${err.message}`);
                    }
                    else
                    {
                        debug(`Client result: ${JSON.stringify(res, null, 0)}`);
                    }
                    return callback(err);
                });
            }
        });
    };
};