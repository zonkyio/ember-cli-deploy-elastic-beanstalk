"use strict";

const AWS = require('aws-sdk');

class S3 {
  constructor(options) {
    options = options || {};

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      region: options.region
    });
  }

  listBuckets() {
    return this.s3.listBuckets().promise()
      .then(data => {
        return data.Buckets.map(b => b.Name);
      });
  }

  createBucket(bucketName) {
    let params = {
      Bucket: bucketName
    };

    return this.s3.createBucket(params).promise();
  }

  upload(bucket, key, file) {
    let params = {
      Bucket: bucket,
      Key: key,
      Body: file
    };

    return new Promise((resolve, reject) => {
      this.s3.upload(params, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  listObjects(bucket, prefix) {
    let params = {
      Bucket: bucket,
      Prefix: prefix
    };

    return this.s3.listObjectsV2(params).promise()
      .then(data => data.Contents);
  }

  headObject(bucket, key) {
    let params = {
      Bucket: bucket,
      Key: key
    };

    return this.s3.headObject(params).promise()
      .catch(error => {
        if (!error || error.code !== 'NotFound') {
          throw error;
        }
      });
  }

  copy(bucket, from, to) {
    let params = {
      Bucket: bucket,
      CopySource: encodeURIComponent([bucket, from].join('/')),
      Key: to
    };

    return this.s3.copyObject(params).promise();
  }
}

module.exports = S3;
