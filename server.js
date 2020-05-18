const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const { connectToDB } = require('./lib/mongo');
const { getImageInfoById, saveImageInfo } = require('./models/image');

const app = express();
const port = process.env.PORT || 8000;

const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif'
};

const upload = multer({
  // dest: `${__dirname}/uploads`
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const filename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = imageTypes[file.mimetype];
      callback(null, `${filename}.${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!imageTypes[file.mimetype]);
  }
});

app.get('/', (req, res, next) => {
  res.status(200).sendFile(__dirname + '/index.html');
});

app.post('/images', upload.single('image'), async (req, res, next) => {
  console.log("== req.file:", req.file);
  console.log("== req.body:", req.body);
  if (req.file && req.body && req.body.userId) {
    const image = {
      contentType: req.file.mimetype,
      filename: req.file.filename,
      path: req.file.path,
      userId: req.body.userId
    };
    const id = await saveImageInfo(image);
    res.status(200).send({
      id: id
    });
  } else {
    res.status(400).send({
      error: "Request body needs an 'image' file and 'userId' field."
    });
  }
});

app.get('/images/:id', async (req, res, next) => {
  try {
    const image = await getImageInfoById(req.params.id);
    if (image) {
      res.status(200).send(image);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

app.use('*', (err, req, res, next) => {
  console.error(err);
  res.status(500).send({
    error: "An error occurred.  Try again later."
  });
});

app.use('*', (req, res, next) => {
  res.status(404).send({
    err: "Path " + req.originalUrl + " does not exist"
  });
});

connectToDB(() => {
  app.listen(port, () => {
    console.log("== Server is running on port", port);
  });
});
