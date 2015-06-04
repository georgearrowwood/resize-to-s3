'use strict';

var gm = require('gm');
var Q = require('q');
var async = require('async');
var AWS = require('aws-sdk');
AWS.config.apiVersions = {s3: '2006-03-01'};

module.exports = ImagesResizeS3;


function ImagesResizeS3(conf) {
  // Todo: validation of params
  // AWS S3 Config   
  AWS.config.region = conf.S3.region;
  AWS.config.update({
    accessKeyId: conf.S3.accessKeyId, 
    secretAccessKey: conf.S3.secretAccessKey
  });
  // bucket object
  this.s3 = new AWS.S3({
    params: {
      Bucket: conf.S3.bucket
    }
  });
  // GraphicsMagick object
  this.gm = null;
  // image extension
  this.format = null;
  // resize to size
  this.dimensions = {
    width: null,
    height: null
  };
};


ImagesResizeS3.prototype.loadImage = function (imagePath) {
  var dimensionsReady = Q.defer();
  var formatReady = Q.defer();

  this.gm = gm(imagePath)
    .size(function (err, value) {
      this.dimensions = value;
      if (err) 
        dimensionsReady.reject(new Error(err));
      else
        dimensionsReady.resolve(value);
    }.bind(this))
    .format(function (err, value) {
      this.format = value;
      if (err) 
        formatReady.reject(new Error(err));
      else
        formatReady.resolve(value);
    }.bind(this));

  return Q.all([dimensionsReady.promise, formatReady.promise]);
}  


ImagesResizeS3.prototype.resize = function(options) {
  var ready = Q.defer();

  if (!options || !Array.isArray(options)) ready.reject('Wrong options format');
  if (this.format !== 'JPEG') this.gm.background('transparency');

  async.eachSeries(options, function iterator(options, cb) {
    this.resizeOne(options);
    this.streamToS3(options, cb);
  }.bind(this), function(err){
    if (err)
      ready.reject(err);
    else
      ready.resolve(options);
  });
  return ready.promise;
}


ImagesResizeS3.prototype.resizeOne = function(options) {
  this.gm
    .resize(options.width, options.height, '>')
    .compose('Copy')
    .gravity('Center')
    .extent(options.width, options.height)
}  


ImagesResizeS3.prototype.streamToS3 = function(options, cb) {
  this.gm.stream(function (err, stdout, stderr) {
    this.s3
      .upload({Body: stdout, Key: options.key + '.' + this.format.toLowerCase()})
      .send(cb);
  }.bind(this));
}

