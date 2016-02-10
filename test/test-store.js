'use strict';

const assert = require('chai').assert;
const cassandra = require('cassandra-driver');
const session = require('express-session');
const uuid = require('uuid');

const CassandraStore = require('../lib/cassandra-store');
const options = {
  table: 'sessions',
  clientOptions: {
    contactPoints: [process.env.DBHOST || 'localhost'],
    keyspace: 'sessions_store'
  }
};
const sid = uuid.v1();
const testSession = {
  'cookie': {
    'path': '/',
    'httpOnly': true,
    'secure': true,
    'maxAge': 600000
  },
  'name': 'sid'
};

let store = null;

describe('cassandra-store', function () {
  it('should creates instance which inherits from session.Store', function () {
    store = new CassandraStore(options);
    assert.instanceOf(store, session.Store);
  });

  it('should init a store with a custom client', function () {
    class CustomClient extends cassandra.Client {}

    store = new CassandraStore({
      table: 'sessions_store.sessions',
      client: new CustomClient({
        contactPoints: options.clientOptions.contactPoints
      })
    });
    assert.instanceOf(store.client, CustomClient);
  });

  it('should create if none supplied', function () {
    store = new CassandraStore(options);
    assert.instanceOf(store.client, cassandra.Client);
  });

  it('should set a session', function (done) {
    store.set(sid, testSession, done);
  });

  it('should get an existing session', function (done) {
    store.get(sid, function (err, session) {
      if (err)
        return done(err);

      assert.deepEqual(session, testSession);
      done();
    });
  });

  it('should get all existing sessions', function (done) {
    store.all(function (err, sessions) {
      if (err)
        return done(err);

      assert.equal(sessions.length, 1);
      assert.deepEqual(sessions[0], testSession);
      done();
    });
  });

  it('should get the sessions count', function (done) {
    store.length(function (err, count) {
      if (err)
        return done(err);

      assert.equal(count, 1);
      done();
    });
  });

  it('should touch an existing session', function (done) {
    function getTTL (timeout, cb) {
      setTimeout(function () {
        store.client.execute(
          `SELECT TTL(session) as ttl FROM ${store.cf} WHERE sid = ?`, [sid], {
            prepare: true
          }, cb);
      }, timeout);
    }

    getTTL(2000, function (err, initial) {
      if(err)
        return done(err);

      store.touch(sid, testSession, function (err) {
        if(err)
          return done(err);

        getTTL(0, function (err, touched) {
          if(err)
            return done(err);

          assert.isAbove(touched.rows[0].ttl, initial.rows[0].ttl);
          done();
        });
      });
    });
  });

  it('should destroy an existing session', function (done) {
    store.destroy(sid, done);
  });

  it('should clear all sessions', function (done) {
    store.set(sid, testSession, function(err) {
      if(err)
        return done(err);

      store.clear(function(err) {
        if(err)
          return done(err);

        store.length(function(err, count) {
          if(err)
            return done(err);

          assert.equal(count, 0);
          done();
        });
      });
    });
  });
});
