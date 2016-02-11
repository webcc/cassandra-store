'use strict';

const util = require('util');

const Client = require('cassandra-driver').Client;
const Store = require('express-session').Store;

class CassandraStore extends Store {
  constructor(options) {
    super(options);

    this.cf = options.table || options.columnFamily || 'sessions';

    if (options.client)
      this.client = options.client;
    else
      this.client = new Client(options.clientOptions || {});
  }

  all(cb) {
    this.client.execute(
      `SELECT * FROM ${this.cf};`, {
        prepare: false
      }, (err, res) => {
        if (err)
          return cb(err);

        let all = [];
        try {
          all = CassandraStore.deserialize(res.rows);
        } catch (e) {
          return cb(e);
        }
        return cb(null, all);
      });
  }

  clear(cb) {
    this.client.execute(
      `TRUNCATE ${this.cf};`, {
        prepare: false
      }, cb);
  }

  destroy(sid, cb) {
    this.client.execute(
      `DELETE FROM ${this.cf} WHERE sid = ?;`, [sid], {
        prepare: true
      }, cb);
  }

  get(sid, cb) {
    this.client.execute(
      `SELECT * FROM ${this.cf} WHERE sid = ?;`, [sid], {
        prepare: true
      }, (err, res) => {
        if (err)
          return cd(err);
        else if (!res.rows.length)
          return cb(null, null);

        let session = null;
        try {
          session = CassandraStore.deserialize(res.rows[0]);
        } catch (e) {
          return cb(e);
        }
        return cb(null, session);
      });
  }

  length(cb) {
    this.client.execute(
      `SELECT COUNT(*) as count FROM ${this.cf};`, {
        prepare: false
      }, (err, res) => {
        if (err)
          return cb(err);

        return cb(null, parseInt(res.rows[0].count.toString(), 10));
      });
  }

  set(sid, session, cb) {
    let ttl = '';

    if (session.cookie.maxAge)
      ttl = `USING TTL ${session.cookie.maxAge / 1000}`;

    this.client.execute(
      `INSERT INTO ${this.cf} (sid, session) VALUES (?, ?) ${ttl};`,
      [sid, CassandraStore.serialize(session)], {
        prepare: true
      }, cb);
  }

  touch(sid, payload, cb) {
    this.set(sid, payload, cb);
  }

  static serialize(data) {
    return JSON.stringify(data);
  }

  static deserialize(data) {
    if (data instanceof Array)
      return data.map(CassandraStore.deserialize);

    return JSON.parse(data.session);
  }
}

module.exports = CassandraStore;
