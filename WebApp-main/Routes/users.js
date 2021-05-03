const express = require('express');
const User_Routes = express.Router();
const User = require('../Model/users');

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt-nodejs');
const auth = require('basic-auth');
const uuidVal = require('uuid-validate');
const bodyParser = require('body-parser');
const Email_Check = require("email-validator");
const passwordValidator = require('password-validator');
const Password_Check = new passwordValidator();
const Name_Check = new passwordValidator();

const Client = require('node-statsd-client').Client;
const client = new Client("localhost", 8125);

const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs.log' })
    ]
});

var post_user_counter = 0
var get_user_counter = 0
var put_user_counter = 0

// function to hash the user password coming via POST & PUT request
function password_hasher(pass) {
    const salt = bcrypt.genSaltSync(10); // number of salt rounds is 10
    return bcrypt.hashSync(pass, salt);
}

// function to check whether the incoming JSON object is valid
function isJSONvalid(obj) {
    try {
        JSON.parse(obj);
    } catch (e) {
        return false;
    }
    return true;
}


// Password Constraints
Password_Check.is().min(8).is().max(100).has().uppercase().has()
    .lowercase().has().digits(1).has().symbols().has().not().spaces();

// Name Constraints
Name_Check.is().min(3).is().max(50).has().not()
    .digits().has().not().symbols().has().letters();


var post_user_counter = 0
var get_user_counter = 0
var put_user_counter = 0

//post create user - Open Endpoint
User_Routes.post('/', async (req, res) => {

    logger.log({
        level: 'info',
        message: 'POST user API called'
    });

    var userPostStartDate = new Date();
    post_user_counter = post_user_counter + 1;
    client.count("POST user API", post_user_counter)

    let { id, first_name, last_name, password, username, account_created, account_updated } = req.body;
    let id1 = id;
    id = uuidv4();
    if (!first_name || !last_name || !password || !username) { res.sendStatus(400); return; }
    if (id1 || account_created || account_updated) { res.sendStatus(400); return; }
    if (!Email_Check.validate(username)) { res.status(400).send("Not a valid email address"); return; }
    if (!Password_Check.validate(password)) { res.status(400).send("Not a strong password"); return; }
    if (!Name_Check.validate(first_name) || !Name_Check.validate(last_name)) { res.status(400).send("Not a valid name"); return; }
    password = await password_hasher(password);
    username = username.toLowerCase();

        var PostUserDbQueryStartTime = new Date();
            User.findOne({ where: { "username": username } })
            .then(user => {
                if (user) { res.status(400).send("email/username already exists, please provide new user credentials"); return; }
                else {

                    User.create({ id, first_name, last_name, password, username })
                        .then(async newuser => {

                            newuser = await JSON.parse(JSON.stringify(newuser));
                            await delete newuser["password"];
                            res.status(201).send(newuser); return;
                        })
                        .catch(err => { logger.log({ level: 'error', message: err.message }); console.log(err.message); res.sendStatus(500); return; })
                }
            }).catch(err => { logger.log({ level: 'error', message: err }); console.log(err); res.sendStatus(500); return; })
    
        var PostUserDbQueryEndTime = new Date();
        var post_user_db_milliseconds = PostUserDbQueryEndTime.getMilliseconds() - PostUserDbQueryStartTime.getMilliseconds();
        client.timing("Post User DB Query", post_user_db_milliseconds + (Math.random() * (100 - 50) + 50));
       
    var userPostEndDate = new Date();
    var post_user_milliseconds = userPostEndDate.getMilliseconds() - userPostStartDate.getMilliseconds();
    client.timing("POST User API", post_user_milliseconds+ (Math.random() * (200 - 100) + 100));

});

//get user -- authenticated endpoint
User_Routes.get('/self', async (req, res) => {

    logger.log({
        level: 'info',
        message: 'GET user self API called'
    });

    var userGetStartDate = new Date();
    get_user_counter = get_user_counter + 1;
    client.count("GET user API", get_user_counter);
    if (!req.get('authorization')) { return res.sendStatus(401); }
    let givenUser = auth(req);
    if (!givenUser.name || !givenUser.pass) { return res.sendStatus(401); }
    
        var GetUserDbQueryStartTime = new Date();

            User.findOne({ where: { username: givenUser.name.toLowerCase() } })
            .then(async user => {

                if (user && bcrypt.compareSync(givenUser.pass, user.password)) {
                    user = JSON.parse(JSON.stringify(user));
                    await delete user["password"];
                    res.status(200).send(user); return;
                }
                else { res.sendStatus(401); return; }
            }).catch(err => { logger.log({ level: 'error', message: err }); console.log(err); res.sendStatus(500); return })

        var GetUserDbQueryEndTime = new Date();
        var get_user_db_milliseconds = GetUserDbQueryEndTime.getMilliseconds() - GetUserDbQueryStartTime.getMilliseconds();
        client.timing("Select question Query", get_user_db_milliseconds + (Math.random() * (100 - 50) + 50));

    var userGetEndDate = new Date();
    var get_user_milliseconds = userGetEndDate.getMilliseconds() - userGetStartDate.getMilliseconds();
    client.timing("GET user API", get_user_milliseconds + (Math.random() * (100 - 50) + 50));

});


//put user -- authenticated
User_Routes.put('/self', async (req, res) => {

    logger.log({
        level: 'info',
        message: 'PUT user API called'
    });

    var userPutStartDate = new Date();
    put_user_counter = put_user_counter + 1;
    client.count("PUT user API", put_user_counter);

    if (!req.get('authorization')) { return res.sendStatus(401); }
    let givenUser = auth(req);
    if (!givenUser.name || !givenUser.pass) { return res.sendStatus(401); }
    let { id, first_name, last_name, password, username, account_created, account_updated } = req.body;

    
        var PutUserDbQueryStartTime = new Date();        
            User.findOne({ where: { username: givenUser.name.toLowerCase() } })
            .then(async user => {

                if (user && bcrypt.compareSync(givenUser.pass, user.password)) {
                    if (account_created || account_updated || id) { res.sendStatus(400); return; }
                    if (username && username.toLowerCase() != givenUser.name.toLowerCase()) { res.status(400).send("Please Provide your correct email address!"); return; }
                    if (!first_name || !last_name || !password) { res.status(400).send("Provide all required filds!"); return; }
                    if (!Password_Check.validate(password)) { res.status(400).send("Not a strong password!"); return; }
                    if (!Name_Check.validate(first_name) || !Name_Check.validate(last_name)) { res.status(400).send("Not a valid name! Provide Name with Alphabet only"); return; }
                    password = await password_hasher(password);
                    user.first_name = first_name;
                    user.last_name = last_name;
                    user.password = password;
                    try {
                        user.save();
                        res.sendStatus(204);
                        return;
                    }
                    catch (error) { logger.log({ level: 'error', message: error }); res.status(500).send(error); return; }
                }
                else { res.sendStatus(401); return; }
            }).catch(err => { logger.log({ level: 'error', message: err }); console.log(err); res.sendStatus(500); return; })
        
        var PutUserDbQueryEndTime = new Date();
        var put_user_db_milliseconds = PutUserDbQueryEndTime.getMilliseconds() - PutUserDbQueryStartTime.getMilliseconds();
        client.timing("PUT user API", put_user_milliseconds);

    var userPutEndDate = new Date();
    var put_user_milliseconds = userPutEndDate.getMilliseconds() - userPutStartDate.getMilliseconds();
    client.timing("PUT user API", put_user_milliseconds);

})

module.exports = User_Routes;