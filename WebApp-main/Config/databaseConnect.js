const Sequelize = require('sequelize');
const winston = require('winston');
const config = {
    "define": {
        dialect: 'postgres'
    },
    dialectOptions: { dateStrings: true, useUTC: false, timezone: '-08:00', ssl:{ require:true, rejectUnauthorized: false}},
    timezone: '-08:00'
}

const sequelize = new Sequelize(process.env.DB_URL, config); 
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs.log' })
    ]
});


module.exports = sequelize;
global.sequelize = sequelize;


