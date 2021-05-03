var AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" })
var docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {   
    console.log(event.Records[0]);
    var subject = event.Records[0].Sns.Subject;
    var body = event.Records[0].Sns.Message;
    console.log(body);
    body = JSON.parse(body);
    
    var body1 = body.id + body.user_email + subject;
    var messagedata;
    var mailsubj;
    var book_url = "http://prod.naveen-csye6225.me/mybooks/" + body.id;
    
    switch (subject) {
        case "book-create":
            messagedata = " Book-ID " + " :- " + body.id + ". <br><a target='_blank' href = '" + book_url + "'>Click to view book created</a></br> .";
            mailsubj = "Your book has been created"
            break;
        case "book-delete":
            messagedata = " Book-ID " + " :- " + body.id + " was deleted by user " + body.user_email;
            mailsubj = "Your book has been deleted"
            break;
        default:
            messagedata = "invalid";
            break;
    }
    
    if (messagedata == "invalid") { 
        console.log("subject wrong");
        return; }
    
    var params = {
        TableName: "csye6225",
        Key: { "id": body1 }
    };
    
    var dbData = {
        TableName: "csye6225",
        Item: { "id": body.id , "action": subject, "book": body.title }
    };
    
    console.log("dynamo db entry");
    docClient.get(params, function (err, data) {
        if (!data.Item) {
            console.log("error - " + JSON.stringify(err, null, 2));

            docClient.put(dbData, function (err, data) {
                if (err) {
                    console.error("Unable to add record in DB. Error JSON:", JSON.stringify(err, null, 2));
                    return err;
                } 
                else {
                    console.log("added to db");
                    var sender = process.env.domainemail;
                    console.log("Sender " + sender);
                    console.log("Receiver" + body.user_email);
                    var params = {
                        Destination: { ToAddresses: [body.user_email] },
                        Message: {
                            Body: {
                                Html: { Charset: "UTF-8", Data: messagedata },
                                Text: { Charset: "UTF-8", Data: "TEXT_FORMAT_BODY" }
                            },
                            Subject: { Charset: 'UTF-8', Data: mailsubj }
                        },
                        Source: sender,
                    };
                    var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
                    sendPromise.then(function (data) { console.log(data.MessageId); }).catch(function (err) { console.error(err, err.stack); });
                    return true;
                }
            });
        }
        else {  console.log("already sent"); return true; }
    });  
    return false;
};