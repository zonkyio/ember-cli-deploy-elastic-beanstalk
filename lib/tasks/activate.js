"use strict";

const S3 = require('../aws/s3');

class ActivateTask {

  constructor(options) {
    this.log = options.log;
    this.revisions = options.revisions;
    this.bucket = options.bucket;
    this.prefix = options.prefix;
    this.suffix = options.suffix;
    this.key = options.key;
    this.revisionKey = options.revisionKey;
    this.s3 = new S3({ region: options.region });
  }

  run() {
    let fullRevisionKey = this._fullRevisionKey();

    this.log('preparing to activate `' + fullRevisionKey + '`', { verbose: true });

    return Promise.resolve(this.revisions)
      .then(revisions => {
        let found = revisions.map(item => item.revision).indexOf(this.revisionKey);

        if (found < 0) {
          return Promise.reject('REVISION NOT FOUND!');
        }

        return this._copy().then(() => {
          this.log(`✔  ${fullRevisionKey} => ${this.key}`);
        });
      });
  }

  _fullRevisionKey() {
    return this.prefix + this.revisionKey + this.suffix;
  }

  _copy() {
    let from = this._fullRevisionKey();
    return this.s3.copy(this.bucket, from, this.key);
  }

}

module.exports = ActivateTask;
