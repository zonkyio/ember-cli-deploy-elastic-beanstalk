/*jshint node: true*/
"use strict";

const path              = require('path');
const glob              = require('glob');
const DeployPlugin      = require('ember-cli-deploy-plugin');
const NPMInstallTask    = require('./tasks/npm-install');
const ZipTask           = require('./tasks/zip');
const UploadTask        = require('./tasks/upload');
const RevisionsTask     = require('./tasks/revisions');
const ActivateTask     = require('./tasks/activate');

const CONFIG_ENV_MAPPING = {
  FASTBOOT_S3_BUCKET: 'bucket',
  FASTBOOT_S3_KEY: 'key'
};

module.exports = DeployPlugin.extend({
  defaultConfig: {
    environment: 'production',
    outputPath: path.join('tmp', 'fastboot-dist'),
    zipPath: path.join('tmp', 'fastboot-dist.zip'),
    revisionKey: function(context) {
      let revisionKey = context.revisionData && context.revisionData.revisionKey;
      return context.commandOptions.revision || revisionKey;
    },
    initialRevisions: function(context) {
      return context.initialRevisions;
    }
  },

  requiredConfig: ['environment', 'bucket', 'key'],

  configure() {
    var config = this.pluginConfig;

    // Copy environment variables to the config if defined.
    for (var key in CONFIG_ENV_MAPPING) {
      if (process.env[key]) {
        config[CONFIG_ENV_MAPPING[key]] = process.env[key];
      }
    }

    config.suffix = path.extname(config.key);
    config.prefix = path.basename(config.key, config.suffix) + '-';

    this._super.configure.apply(this, arguments);
  },

  willUpload(context) {
    let distDir = context.distDir;
    let zipPath = this.readConfig('zipPath');

    let npmInstallTask = new NPMInstallTask({
      log: this.log.bind(this),
      distDir: distDir
    });

    let zipTask = new ZipTask({
      context: context,
      log: this.log.bind(this),
      distDir: distDir,
      zipPath: zipPath
    });

    return npmInstallTask.run()
      .then(() => zipTask.run());
  },

  upload: function(context) {
    let region = this.readConfig('region');
    let bucket = this.readConfig('bucket');
    let prefix = this.readConfig('prefix');
    let suffix = this.readConfig('suffix');
    let accessKeyId = this.readConfig('accessKeyId');
    let secretAccessKey = this.readConfig('secretAccessKey');
    let sessionToken = this.readConfig('sessionToken');
    let key = prefix + this.readConfig('revisionKey') + suffix;

    let uploadTask = new UploadTask({
      context: context,
      log: this.log.bind(this),
      hashedZipPath: context.hashedZipPath,
      region: region,
      bucket: bucket,
      accessKeyId,
      secretAccessKey,
      sessionToken,
      key: key
    });

    return uploadTask.run();
  },

  activate: function() {
    let region = this.readConfig('region');
    let bucket = this.readConfig('bucket');
    let prefix = this.readConfig('prefix');
    let suffix = this.readConfig('suffix');
    let revisionKey = this.readConfig('revisionKey');
    let key = this.readConfig('key');
    let accessKeyId = this.readConfig('accessKeyId');
    let secretAccessKey = this.readConfig('secretAccessKey');
    let sessionToken = this.readConfig('sessionToken');
    let log = this.log.bind(this);

    return this.fetchRevisions().then(data => {
      let activateTask = new ActivateTask({
        revisions: data.revisions,
        region,
        bucket,
        accessKeyId,
        secretAccessKey,
        sessionToken,
        prefix,
        suffix,
        revisionKey,
        key,
        log
      });
      return activateTask.run();
    });
  },

  fetchInitialRevisions: function() {
    return this._fetchRevisions('initialRevisions');
  },

  fetchRevisions: function() {
    return this._fetchRevisions('revisions');
  },

  _fetchRevisions(as) {
    let region = this.readConfig('region');
    let bucket = this.readConfig('bucket');
    let prefix = this.readConfig('prefix');
    let suffix = this.readConfig('suffix');
    let accessKeyId = this.readConfig('accessKeyId');
    let secretAccessKey = this.readConfig('secretAccessKey');
    let sessionToken = this.readConfig('sessionToken');

    let key = this.readConfig('key');

    let revisionsTask = new RevisionsTask({ region, bucket, prefix, suffix, key, accessKeyId, secretAccessKey, sessionToken });
    return revisionsTask.run().then(revisions => ({ [as]: revisions }));
  },

  _logSuccess: function(outputPath) {
    var self = this;
    var files = glob.sync('**/**/*', { nonull: false, nodir: true, cwd: outputPath });

    if (files && files.length) {
      files.forEach(function(path) {
        self.log('✔  ' + path, { verbose: true });
      });
    }
    self.log('fastboot build ok', { verbose: true });

    return Promise.resolve(files);
  }
});
