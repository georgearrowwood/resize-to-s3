# Resize Image to various sizes and save stream to Amazon AWS S3.

### Install with npm

```shell
npm i resize-to-s3
```

### Use

```javascript
var ResizeToS3 = require('resize-to-s3');

// AWS S3 config
var conf = {
  S3: {
    region: 'eu-west-1',
    accessKeyId: 'XXXXXX',
    secretAccessKey: 'XXXXXXXXXXXXXX',
    bucket: 'bucket-name'
  }
};

// set up resize destinations and file names
var destinations = [{
  width:200, 
  height: 200,
  key: 'images/small' // file extension will be added to it
},
{
  width:400, 
  height: 400,
  key: 'images/bigger' // file extension will be added to it
}];

var resizeToS3 = new ResizeToS3(conf);  
  
resizeToS3
  .loadImage(path.resolve('test/media/lina.jpg'))
  .then(function(res){ 
    console.log('image loaded!', res);
    // resize and send stream to s3
    return resizeToS3.resize(destinations)
  })
  .then(function(res){ 
    console.log('Images resized and sent to S3!', res);
  })
  .fail(function (err) {
    console.log('Error!', err)
  });

```

## [MIT License](https://github.com/georgearrowwood/resize-to-s3/blob/master/LICENSE)