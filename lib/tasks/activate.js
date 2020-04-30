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
    const accessKeyId = options.accessKeyId;
    const secretAccessKey = options.secretAccessKey;
    const sessionToken = options.sessionToken;
    this.s3 = new S3({
      region: options.region,
      accessKeyId,
      secretAccessKey,
      sessionToken
    });
  }

  run() {
    let fullRevisionKey = this._fullRevisionKey();

    this.log('preparing to activate `' + fullRevisionKey + '`', { verbose: true });

    return this.s3.s3.headObject({
      Bucket: this.bucket,
      Key: fullRevisionKey
    })
      .promise()
      .then(() => {
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
