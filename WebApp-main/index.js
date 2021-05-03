require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors')
const NODE_PORT = process.env.PORT || 3000;
const DB = require('./Config/databaseConnect');
const User = require('./Model/users');
const Book = require('./Model/book');
const Image = require('./Model/image')
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs.log' })
    ]
});

const expressWinston = require('express-winston');
app.use(expressWinston.logger({
  transports: [
    new winston.transports.File({ filename: 'logs.log', level: 'warn' })
  ],
  format: winston.format.json(),
  metaField: null,
  meta: false, 
  statusLevels: true,
  msg: "HTTP {{req.method}} {{req.url}} User error/Bad Request"
}));

DB.authenticate()
  .then(logger.log({
    level: 'info',
    message: 'Connected to database'
}))
  .catch(err => logger.log({
    level: 'error',
    message: err 
}))


app.use(express.json());
app.use(cors());
app.use('/v1/users', require('./Routes/users'));
app.use('/mybooks', require('./Routes/books'));

Book.belongsTo(User,{foreignKey: 'user_id'});
Image.belongsTo(Book, {foreignKey:'book_id'});
Image.belongsTo(User,{foreignKey:'user_id'});

Book.hasMany(Image,{foreignKey: 'book_id'});
User.hasMany(Book,{foreignKey:'user_id'});
User.hasMany(Image,{foreignKey: 'user_id'})

DB.sync();

app.get('/', (req, res) => res.send(200));

app.listen(NODE_PORT, console.log(`Serving on port ${NODE_PORT}`), logger.log({
  level: 'info',
  message: `Serving on port ${NODE_PORT}`
}));