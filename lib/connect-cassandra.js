var debug = require('debug')('connect:cassandra');
var cassandra = require('cassandra-driver');
var default_port = 6379;
var default_host = '127.0.0.1';
var TTLDefault = 86400;
var tableName = "aztec_session";

var queryOptions = {
    consistency: cassandra.types.consistencies.quorum,
    prepare: true
};

/**
 * Return the `cassandraStore` extending `express`'s session Store.
 *
 * @param {object} express session
 * @return {Function}
 * @api public
 */

module.exports = function(session){

    /**
     * Express's session Store.
     */
    var Store = session.Store;

    /**
     * Initialize cassandraStore with the given `options`.
     *
     * @param {Object} options
     * @api public
     */

    function cassandraStore(options) {
        options = options || {};
        Store.call(this, options);
        this.dbConfig = options;
        this.dbConfig.ttl =  options.ttl || TTLDefault;
        this.client = new cassandra.Client({contactPoints: this.dbConfig.hosts, keyspace: this.dbConfig.keyspace}); //FIXME: more params
        debug("DB Config", this.dbConfig);
        this.client.connect(function (err) {
            if(err){
                debug("disconnected");
                self.emit('disconnect');
            }
        });
        this.client.on('log', function(level, className, message, furtherInfo) {
            debug('log event: %s -- %s', level, message);
        });
        debug("store initialized");
    }
    /**
     * Inherit from `Store`.
     */

    cassandraStore.prototype.__proto__ = Store.prototype;
    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */
    cassandraStore.prototype.get = function(sid, fn){
        debug('GET "%s"', sid);
        var query = 'SELECT sobject from  ' + tableName + ' WHERE sid= ? ;';
        var params = [sid];
        debug(queryOptions);
        this.client.execute(query, params, queryOptions, function(err, result) {
            debug('Query "%s"', query);
            if(err){
                debug('Something went wrong', err);
                return fn(err, null);
            }
            var session = null;
            try{
                if(result && result.rows){
                    if(result.rows.length>0 && result.rows[0].sobject){
                        session = JSON.parse(result.rows[0].sobject);
                    }
                    else{
                        session = null;
                    }
                }
                else{
                    return fn("unknow error", null);
                }
            }
            catch (e){
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
    cassandraStore.prototype.set = function(sid, sess, fn){
        var self = this;
        debug(this.dbConfig.keyspace);
        try {
            var maxAge, ttl;
            maxAge = sess.cookie.maxAge;
            var sobject = JSON.stringify(sess);//.replace(/\"/g, "'");
            debug('SETEX "%s" ttl:%s %s', sid, self.ttl, sobject);
            this.get(sid, function (error, result){
                var query, params;
                if(!error && result){
                    query = "UPDATE " + tableName + " SET sobject='" + sobject + "' WHERE sid='" + sid + "';";
                }
                else{
                    query = "INSERT INTO " + tableName + " (sid, sobject) VALUES ('" + sid + "', '" + sobject + "') USING TTL " + self.dbConfig.ttl +";" ;
                }
                debug("params", params);
                self.client.execute(query, queryOptions, function(err, result) {
                    debug("query", query);
                    if (err){
                        debug(err);
                        return fn(err);
                    }
                    debug('session added');
                    return fn(null, result);
                });
            });
        } catch (err) {
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
    cassandraStore.prototype.destroy = function(sid, fn){
        var query = "DELETE from " + tableName + " WHERE sid='" + sid + "'";
        this.client.execute(query, queryOptions, function(err) {
            if (err){
                return fn(err);
            }
            debug('session deleted');
            return fn();
        });
    };
    return cassandraStore;
};