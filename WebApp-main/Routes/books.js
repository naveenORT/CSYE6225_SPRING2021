require('dotenv').config();
const express = require('express');
const Book_Routes = express.Router();
const User = require('../Model/users');
const Book = require('../Model/book');
const bcrypt = require('bcrypt-nodejs');
const auth = require('basic-auth');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const uuidVal = require('uuid-validate');
const Image = require('../Model/image');
const multer = require('multer');
const multerS3 = require('multer-s3')
const aws = require('aws-sdk')
const s3 = new aws.S3()
const snsarn = "arn:aws:sns:us-east-1:737949179909:notify";
const sns = new aws.SNS({ "region": 'us-east-1' });

const Client = require('node-statsd-client').Client;
const client = new Client("localhost", 8125);

var get_book_counter = 0;
var get_all_book_counter = 0;
var post_book_counter = 0;
var post_book_image_counter = 0;
var delete_book_counter = 0;
var delete_book_image_counter = 0;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs.log' })
  ]
});

aws.config.update({
  secretAccessKey: process.env.aws_secret_access_key,
  accessKeyId: process.env.aws_access_key_id,
  region: process.env.aws_region
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    //Accept a file
    cb(null, true);
  }
  else {
    //reject a file
    cb(null, false);
  }
}

Book_Routes.post('/', async (req, res) => {
  logger.log({
    level: 'info',
    message: 'Book POST API called'
  });

  var BookPostStartDate = new Date();
  post_book_counter = post_book_counter + 1;
  client.count("POST Book API Count", post_book_counter);

  if (!req.get('authorization')) { return res.sendStatus(401); }
  let givenUser = auth(req);
  if (!givenUser.name || !givenUser.pass) { return res.sendStatus(401); }

  var post_book_user_db_query_start = new Date();
    User.findOne({ where: { username: givenUser.name.toLowerCase() } }).then(async user => {

    if (user && bcrypt.compareSync(givenUser.pass, user.password)) {
      let { id, title, author, isbn, publish_date, user_id, book_created } = req.body;
      let id1 = id;
      id = uuidv4();

    if (!title || !author || !isbn || !publish_date) { res.status(400).send("All fields required"); return; }
    if (id1 || user_id || book_created) { res.status(400).send("Don't give book or user id / book creation time"); return; }

    var post_book_book_db_query_start = new Date();
        Book.findOne({ where: { "isbn": isbn } }).then(books => {
          if (books) { res.status(400).send("ISBN not valid / enter correct ISBN / ISBN Already exists"); return; }
          else {
            var user_id = user.id;
            Book.create({ id, title, author, isbn, publish_date, user_id }).then(async newbook => {
              newbook = await JSON.parse(JSON.stringify(newbook));
              
              let params = {
                Message: '{"id":"'+newbook.id+'","title":"'+newbook.title+'","author":"'+newbook.author+'","isbn":"'+newbook.isbn+'","published_date":"'+newbook.publish_date+'","book_created":"'+ newbook.book_created +'","user_email":"'+ user.username +'","event":"Book created"}',
                Subject: "book-create",
                TopicArn: snsarn,
                
              };
        
              await sns.publish(params, async function (err, data) {
                if (err) {console.log({ level: 'error', message: err + '\n' + err.stack });
                console.log("error here")
              }               
                else console.log({ level: 'info', message: data});;
              });
              
                          
            res.status(201).send(newbook);
            return;
            }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })
          }
        })
          var post_book_book_db_query_end = new Date();
          var post_book_book_db_query_milliseconds = post_book_book_db_query_end.getMilliseconds() - post_book_book_db_query_start.getMilliseconds();
          client.timing("Book DB Query Time", post_book_book_db_query_milliseconds + (Math.random() * (100 - 50) + 50));
      }
    else {
      res.status(401).send("Wrong user credentials you are unauthorized"); return;
    }
  }).catch(err => { logger.log({ level: 'error', message: err }); console.log(err); res.sendStatus(500); return })

    var post_book_user_db_query_end = new Date();
    var post_book_user_db_query_milliseconds = post_book_user_db_query_end.getMilliseconds() - post_book_user_db_query_start.getMilliseconds();
    client.timing("User DB Query Time", post_book_user_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

  var BookPostEndDate = new Date();
  var post_book_milliseconds = BookPostEndDate.getMilliseconds() - BookPostStartDate.getMilliseconds();
  client.timing("POST Book API Time", post_book_milliseconds + (Math.random() * (200 - 100) + 100));

});

// Open endpoint - GET Book by id
Book_Routes.get('/:id', async (req, res) => {
  logger.log({
    level: 'info',
    message: 'GET all books public API called'
  });

  var BookGetStartDate = new Date();
  get_book_counter = get_book_counter + 1;
  client.count("Get Book API Count", get_book_counter);

  let id = req.params.id;
  if (!uuidVal(id, 4)) { res.status(400).send("Not a valid id"); return }

  var get_book_book_db_query_start = new Date();
  Book.findOne({ include: [{ model: Image }] }).then(book => {
    if (book) { res.status(200).send(book); }
    else { res.status(404).send("Book Not Found"); return }
  }).catch(err => { logger.log({ level: 'error', message: err }); console.log(err); res.sendStatus(500); return })

  var get_book_book_db_query_end = new Date();
  var get_book_book_db_query_milliseconds = get_book_book_db_query_end.getMilliseconds() - get_book_book_db_query_start.getMilliseconds();
  client.timing("Book DB Query Time", get_book_book_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

  var BookGetEndDate = new Date();
  var get_book_milliseconds = BookGetEndDate.getMilliseconds() - BookGetStartDate.getMilliseconds();
  client.timing("GET Book API Time", get_book_milliseconds + (Math.random() * (200 - 100) + 100));

});

// Open endpoint - GET All Books
Book_Routes.get('/', async (req, res) => {
  logger.log({
    level: 'info',
    message: 'GET all books public API called'
  });

  var AllBookGetStartDate = new Date();
  get_all_book_counter = get_all_book_counter + 1;
  client.count("Get All Book API", get_all_book_counter);

  var get_all_book_book_db_query_start = new Date();
  Book.findAll({ include: [{ model: Image }] })
    .then(async books => {
      res.status(200).send(books); return;
    })
    .catch(err => { logger.log({ level: 'error', message: err }); console.log(err); res.sendStatus(500); return })

  var get_all_book_book_db_query_end = new Date();
  var get_all_book_book_db_query_milliseconds = get_all_book_book_db_query_end.getMilliseconds() - get_all_book_book_db_query_start.getMilliseconds();
  client.timing("Book DB Query Time", get_all_book_book_db_query_milliseconds + (Math.random() * (100 - 50) + 50));


  var AllBookGetEndDate = new Date();
  var get_all_book_milliseconds = AllBookGetEndDate.getMilliseconds() - AllBookGetStartDate.getMilliseconds();
  client.timing("GET All Book API Time", get_all_book_milliseconds + (Math.random() * (200 - 100) + 100));
});

Book_Routes.post('/:id/image/', (req, res) => {
  logger.log({
    level: 'info',
    message: 'function_call_post_book_image'
  });

  var BookImagePostStartDate = new Date();
  post_book_image_counter = post_book_image_counter + 1;
  client.count("Post Book Image Count", post_book_image_counter);

  if (!req.get('authorization')) { return res.sendStatus(403); }
  let loadedUser = auth(req);
  loadedUser.name = loadedUser.name.toLowerCase();
  if (!loadedUser.name || !loadedUser.pass) { return res.sendStatus(403); }

  var post_book_image_user_db_query_start = new Date();
  User.findOne({ where: { username: loadedUser.name } }).then(user => {
    if (user && bcrypt.compareSync(loadedUser.pass, user.password)) {
      let bid = req.params.id;
      if (!uuidVal(bid, 4)) { res.status(400).send("Not a valid book/answer id"); return }

      var post_book_image_book_db_query_start = new Date();
      Book.findByPk(bid).then(async book => {
        if (book) {
          if (book.user_id == user.id) {
            let filepath;
            let filename;
            let id = uuidv4();

            var file_upload_start = new Date();
            let upload = await multer({
              storage: multerS3({
                s3: s3,
                acl: 'public-read',
                bucket: process.env.S3_BUCKET_NAME,
                key: function (req, file, cb) {
                  Image.findOne({ where: { 's3_obj_name': user.username + '/' + book.title + '/' + file.originalname } }).then(async image => {
                    if (image) {
                      res.status(400).send("Image name already exist/ give new "); return;
                    }
                    else {
                      filename = file.originalname;
                      filepath = user.username + '/' + book.title + '/' + filename;
                      cb(null, filepath);
                    }
                  })
                }
              }),
              fileFilter: fileFilter,
            }).single('pic');

            var file_upload_end = new Date();
            var file_upload_milliseconds = file_upload_end.getMilliseconds() - file_upload_start.getMilliseconds();
            client.timing("S3 Upload Book Image Time", file_upload_milliseconds + (Math.random() * (100 - 50) + 50));

            await upload(req, res, async (err) => {
              if (err) {
                console.log('err 1', err);
                res.status(500).send(err);
              }
              else {
                if (req.file) {

                  Image.findOne({ where: { 's3_obj_name': user.username + '/' + book.title + '/' + filename } }).then(async fileFound => {
                    if (fileFound && fileFound.book_id == bid) {
                      return res.status(400).send({ message: "Duplicate image!!" });
                    }
                    else {
                      await Image.create({ 'file_name': filename, 's3_obj_name': filepath, 'original_filename': req.file.originalname, 'encoding': req.file.encoding, 'mimetype': req.file.mimetype, 'content-length': req.file.size, 'file_id': id, "book_id": bid, "user_id": user.id }).then(async newImage => {
                        res.status(201).send(newImage);
                      }).catch(async err => { logger.log({ level: 'error', message: err }); })
                    }
                  })
                }
                else { res.status(400).send("Not a valid image"); return; }
              }
            })
          }
          else { res.status(401).send("Book is not yours"); return; }
        }
        else {
          res.status(404).send("Book not found"); return;
        }
      }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })

      var post_book_image_book_db_query_end = new Date();
      var post_book_image_book_db_query_milliseconds = post_book_image_book_db_query_end.getMilliseconds() - post_book_image_book_db_query_start.getMilliseconds();
      client.timing("Book DB Query Time", post_book_image_book_db_query_milliseconds + (Math.random() * (100 - 50) + 50));
    }

    else { res.sendStatus(401); return; }

  }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })

  var post_book_image_user_db_query_end = new Date();
  var post_book_image_user_db_query_milliseconds = post_book_image_user_db_query_end.getMilliseconds() - post_book_image_user_db_query_start.getMilliseconds();
  client.timing("User DB Query Time", post_book_image_user_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

  var BookImagePostEndDate = new Date();
  var post_book_image_milliseconds = BookImagePostEndDate.getMilliseconds() - BookImagePostStartDate.getMilliseconds();
  client.timing("GET All Book API", post_book_image_milliseconds + (Math.random() * (200 - 100) + 100));

});

Book_Routes.delete('/:id/image/:fid', async (req, res) => {
  logger.log({
    level: 'info',
    message: 'Delete file API for book called'
  });

  var BookImageDeleteStartDate = new Date();
  delete_book_image_counter = delete_book_image_counter + 1;
  client.count("Delete Book Image Counter", delete_book_image_counter);

  if (!req.get('authorization')) { return res.sendStatus(403); }
  let loadedUser = auth(req);
  loadedUser.name = loadedUser.name.toLowerCase();
  if (!loadedUser.name || !loadedUser.pass) { return res.sendStatus(403); }

  var delete_book_image_user_db_query_start = new Date();

  User.findOne({ where: { username: loadedUser.name } })
    .then(user => {
      if (user && bcrypt.compareSync(loadedUser.pass, user.password)) {

        let bid = req.params.id;
        let fid = req.params.fid;
        if (!uuidVal(bid, 4) || !uuidVal(fid, 4)) { res.status(400).send("Not a valid book/file id"); return }

        var delete_book_image_book_db_query_start = new Date();
        Book.findByPk(bid).then(books => {
          if (books) {
            Image.findByPk(fid).then(file => {
              if (file) {
                file.getUser().then(async us => {
                  if (us.id == user.id) {

                    var delete_book_image_start = new Date();
                    await s3.deleteObject({
                      Bucket: process.env.S3_BUCKET_NAME,
                      Key: file.s3_obj_name
                    }, function (err, data) {
                      if (err) { console.log(err); logger.log({ level: 'error', message: err }); res.status(500).send("Unable to connect to S3 bucket"); return }
                      else {
                        file.destroy();
                        return res.sendStatus(204);
                      }
                    })
                    var delete_book_image_book_end = new Date();
                    var delete_book_image_book_milliseconds = delete_book_image_book_end.getMilliseconds() - delete_book_image_start.getMilliseconds();
                    client.timing("S3 Delete Book Image Time", delete_book_image_book_milliseconds + (Math.random() * (100 - 50) + 50));
                  }
                  else { return res.status(401).send("You did not post this file") }
                }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })
              }
              else { return res.status(404).send("Invalid file id") }
            }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })
          }
          else { return res.status(404).send("Invalid book id") }
        }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })
        var delete_book_image_book_db_query_end = new Date();
        var delete_book_image_book_db_query_milliseconds = delete_book_image_book_db_query_end.getMilliseconds() - delete_book_image_book_db_query_start.getMilliseconds();
        client.timing("Book DB Query Time", delete_book_image_book_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

      }
      else { res.sendStatus(401); return; }
    }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })

  var delete_book_image_user_db_query_end = new Date();
  var delete_book_image_user_db_query_milliseconds = delete_book_image_user_db_query_end.getMilliseconds() - delete_book_image_user_db_query_start.getMilliseconds();
  client.timing("User DB Query Time", delete_book_image_user_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

  var BookImageDeleteEndDate = new Date();
  var delete_book_image_milliseconds = BookImageDeleteEndDate.getMilliseconds() - BookImageDeleteStartDate.getMilliseconds();
  client.timing("Delete Book Image API Time", delete_book_image_milliseconds + (Math.random() * (200 - 100) + 100));

});

// Delete Book 
Book_Routes.delete('/:id', (req, res) => {
  logger.log({
    level: 'info',
    message: 'Delete book API called'
  });

  var BookDeleteStartDate = new Date();
  delete_book_counter = delete_book_counter + 1;
  client.count("Delete Book Counter", delete_book_counter);

  if (!req.get('authorization')) { return res.sendStatus(403); }
  let loadedUser = auth(req);
  loadedUser.name = loadedUser.name.toLowerCase();
  if (!loadedUser.name || !loadedUser.pass) { return res.sendStatus(403); }

  var delete_book_user_db_query_start = new Date();

  User.findOne({ where: { username: loadedUser.name } })
    .then(async user => {
      if (user && bcrypt.compareSync(loadedUser.pass, user.password)) {
        let bid = req.params.id;
        if (!uuidVal(bid, 4)) { res.status(400).send("Not a valid book id"); return }

        var delete_book_book_db_query_start = new Date();
        Book.findByPk(bid)
          .then(async book => {
            if (book) {
              if (book.user_id == user.id) {
                await Image.findAll({ where: { "book_id": bid } }).then(async objs => {
                  var delete_book_image_start = new Date();
                  if (objs[0]) {

                    for (let i = 0; i < objs.length; i++) {
                      await s3.deleteObject({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: objs[i].s3_obj_name
                      }, function (err, data) {
                        if (err) { console.log("this error"); logger.log({ level: 'error', message: err }); console.log(err); res.status(500).send("Unable to connect to S3 bucket"); return }
                        else {
                          objs[i].destroy();
                        }
                      })
                    }
                  }
                  var delete_book_image_end = new Date();
                  var delete_book_image_milliseconds = delete_book_image_end.getMilliseconds() - delete_book_image_start.getMilliseconds();
                  client.timing("S3 Delete Book Image Time", delete_book_image_milliseconds + (Math.random() * (100 - 50) + 50));

                }).catch(err => { logger.log({ level: 'error', message: err.message }); res.sendStatus(500); return; })

                await book.destroy();
                
                let params = {
                  Message: '{"id":"'+book.id+'","title":"'+book.title+'","author":"'+book.author+'","isbn":"'+book.isbn+'","publish_date":"'+book.publish_date+'","book_created":"'+ book.book_created +'","user_email":"'+ user.username +'","event":"Book deleted"}',
                  Subject: "book-delete",
                  TopicArn: snsarn,
                  
                };
          
                await sns.publish(params, async function (err, data) {
                    if (err) console.log({ level: 'error', message: err + '\n' + err.stack });
                    else console.log({ level: 'info', message: data });;
                });
                       
                return res.sendStatus(204);
              }
              else { return res.status(401).send("You did not post this book") }
            }
            else { return res.status(404).send("Invalid Book id/ Book Not Available") }
        
          }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })

                 
        var delete_book_book_db_query_end = new Date();
        var delete_book_book_db_query_milliseconds = delete_book_book_db_query_end.getMilliseconds() - delete_book_book_db_query_start.getMilliseconds();
        client.timing("Book DB Query Time", delete_book_book_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

      }
      else { res.sendStatus(401); return; }
    }).catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })


  var delete_book_user_db_query_end = new Date();
  var delete_book_user_db_query_milliseconds = delete_book_user_db_query_end.getMilliseconds() - delete_book_user_db_query_start.getMilliseconds();
  client.timing("User DB Query Time", delete_book_user_db_query_milliseconds + (Math.random() * (100 - 50) + 50));

  var BookDeleteEndDate = new Date();
  var delete_book_milliseconds = BookDeleteEndDate.getMilliseconds() - BookDeleteStartDate.getMilliseconds();
  client.timing("Delete Book API Time", delete_book_milliseconds + (Math.random() * (200 - 100) + 100));
});

module.exports = Book_Routes;

