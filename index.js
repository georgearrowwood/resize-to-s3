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


ImagesResizeS3.prototype.resize = function(imageSizes) {
  var ready = Q.defer();

  if (!imageSizes || !Array.isArray(imageSizes)) ready.reject('Wrong image sizes format, must be an array');
  if (this.format !== 'JPEG') this.gm.background('transparency');

  var keys = [];

  async.eachSeries(imageSizes, function iterator(imageSize, cb) {
    this.resizeOne(imageSize);
    this.streamToS3(imageSize, function(err, key){
      if (err) cb(err);
      else {
        imageSize.key = key;
        keys.push(imageSize);
        cb();
      }  
    });
  }.bind(this), function(err){
    if (err)
      ready.reject(err);
    else
      ready.resolve(keys);
  });
  return ready.promise;
}


ImagesResizeS3.prototype.resizeOne = function(imageSize) {
  this.gm
    .resize(imageSize.width, imageSize.height, '>')
    .compose('Copy')
    .gravity('Center')
    .extent(imageSize.width, imageSize.height)
}  


ImagesResizeS3.prototype.streamToS3 = function(imageSize, cb) {

  var key = imageSize.key + '.' + this.format.toLowerCase();

  this.gm.stream(function (err, stdout, stderr) {
    this.s3
      .upload({
        Body: stdout, 
        Key: key,
        ACL: 'public-read'
      })
      .send(function(err, res){
        if (err) cb(err);
        else cb(null, key);
      });
  }.bind(this));
}

