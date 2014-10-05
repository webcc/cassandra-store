var debug = require("debug")("cassandra-store");
var cassandra = require("cassandra-driver");
var TABLE = "sessions";
var queryOptions = {
    consistency: cassandra.types.consistencies.quorum,
    prepare: true
};
var defOptions = {
    "contactPoints": [ "localhost:9042" ],
    "keyspace": "DEFAULTKS"
};
/**
 * Return the `cassandraStore` extending `express`'s session Store.
 *
 * @param {object} express session
 * @return {Function}
 * @api public
 */

module.exports = function (session)
{
    /**
     * Express's session Store.
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
        options = options || defOptions;
        Store.call(this, options);
        this.options = options;
        this.client = new cassandra.Client(options); //FIXME: more params
        debug("DB Config", this.options);
        this.client.connect(function (err)
        {
            if (err)
            {
                debug("disconnected");
            }
        });
        this.client.on('log', function (level, className, message, furtherInfo)
        {
            debug('log event: %s -- %s', level, message);
        });
        debug("store initialized");
    }

    /**
     * Inherit from `Store`.
     */

    CassandraStore.prototype.__proto__ = Store.prototype;
    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */
    CassandraStore.prototype.get = function (sid, fn)
    {
        debug('GET "%s"', sid);
        var query = 'SELECT sobject from  ' + TABLE + ' WHERE sid= ? ;';
        var params = [sid];
        debug(queryOptions);
        this.client.execute(query, params, queryOptions, function (err, result)
        {
            debug('Query "%s"', query);
            if (err)
            {
                debug('Something went wrong', err);
                return fn(err, null);
            }
            var session = null;
            try
            {
                if (result && result.rows)
                {
                    if (result.rows.length > 0 && result.rows[0].sobject)
                    {
                        session = JSON.parse(result.rows[0].sobject);
                    }
                    else
                    {
                        session = null;
                    }
                }
                else
                {
                    return fn("unknow error", null);
                }
            }
            catch (e)
            {
                return fn(e, null);
            }
            debug('got session ' + session);
            return fn(null, session);
        });
    };
    /**
     * Commit the given `sess` object associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

        //TODO : this is only insert or also for update - update TTL?
    CassandraStore.prototype.set = function (sid, sess, fn)
    {
        var self = this;
        debug(this.options.keyspace);
        try
        {
            var maxAge = sess.cookie.maxAge;
            var sobject = JSON.stringify(sess);//.replace(/\"/g, "'");
            this.get(sid, function (error, result)
            {
                var query, params;
                if (!error && result)
                {
                    query = "UPDATE " + TABLE + " SET sobject='" + sobject + "' WHERE sid='" + sid + "';";
                }
                else
                {
                    query = "INSERT INTO " + TABLE + " (sid, sobject) VALUES ('" + sid + "', '" + sobject + "') USING TTL " + Math.round(sess.cookie.maxAge/1000) + ";";
                }
                debug("params", params);
                self.client.execute(query, queryOptions, function (err, result)
                {
                    debug("query", query);
                    if (err)
                    {
                        debug(err);
                        return fn(err);
                    }
                    debug('session added');
                    return fn(null, result);
                });
            });
        }
        catch (err)
        {
            debug(err);
            fn && fn(err);
        }
    };
    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @api public
     */
    CassandraStore.prototype.destroy = function (sid, fn)
    {
        var query = "DELETE from " + TABLE + " WHERE sid='" + sid + "'";
        this.client.execute(query, queryOptions, function (err)
        {
            if (err)
            {
                return fn(err);
            }
            debug('session deleted');
            return fn();
        });
    };
    return CassandraStore;
};