"use strict";

const S3 = require('../aws/s3');

class RevisionsTask {

  constructor(options) {
    this.bucket = options.bucket;
    this.prefix = options.prefix;
    this.suffix = options.suffix;
    this.key = options.key;
    this.s3 = new S3({
      region: options.region,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      sessionToken: options.sessionToken
    });
  }

  run() {
    return Promise.all([this._current(), this._list()])
      .then(([current, list]) => {
        return list.map(item => {
          let revision = this._revisionFor(item);
          let active = this._isActive(item, current);

          return { revision, active, timestamp: new Date(item.LastModified) };
        });
      });
  }

  _current() {
    return this.s3.headObject(this.bucket, this.key);
  }

  _list() {
    return this.s3.listObjects(this.bucket, this.prefix)
      .then(list => list.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified)));
  }

  _revisionFor(object) {
    let key = object.Key;
    return key.substring(this.prefix.length, key.length - this.suffix.length);
  }

  _isActive(object, current) {
    return current && object.ETag === current.ETag;
  }

}

module.exports = RevisionsTask;
