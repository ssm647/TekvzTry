'use strict';
require('dotenv').config();

var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var cors = require('cors');
var fs = require('fs');

const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

var app = express();

var con = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_database
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cors());

con.connect();

// Random password generator
function randomPassword(length) {
    var chars = "abcdefghijklmnopqrstuvwxyz_!@#$%^&*()-+<>ABCDEFGHIJKLMNOP1234567890";
    var pass = "";
    for (var x = 0; x < length; x++) {
        var i = Math.floor(Math.random() * chars.length);
        pass += chars.charAt(i);
    }
    return pass;
}

function generate() {
    return randomPassword(10);
}

// Add a new user
app.post('/user', function (req, res) {
    console.log('Creating a new user...');
    //generating password in plaintext
    const password_plaintext = generate();
    //hashing it to store in db, with 10 rounds of salts
    let hash = bcrypt.hashSync(password_plaintext, 10);
    let role = req.body.role;
    let id;
    var user;
    let proj_desc;
    let proj_count;
    var assn;

    if (role == undefined || role == null){
        return res.status(400).send({ error:true, message: 'Please provide user role' });
    }
    else if( role =="Admin"){
        user = {
            // add a email, where only registered admins should create other admin(s)
            // Admin_added = req.body.admin_id
            // gotta update schema before doing this
            ad_EmailID : req.body.email,
            password: hash
        }
    }
    else if( role == "User"){
        user = {
            ur_EmailID : req.body.email,
            password: hash,
            Architect_added: req.body.arch_id
        }
        proj_desc = {
            Project_Desc: req.body.desc
        };

        let firstName = req.body.firstName;
        let lastName = req.body.lastName;
        console.log(firstName, lastName);
        con.query("INSERT INTO project_details SET ? ", proj_desc, function (error, results, fields) {
            if (error) throw error;
            // On successful creation of project, create User(ergo client)
        });


        //var sql = "UPDATE customers SET address = 'Canyon 123' WHERE address = 'Valley 345'";
        con.query('UPDATE Architect SET First_Name = ?, Last_Name = ? WHERE ar_emailID = ?', [firstName, lastName, req.body.email], function (error, results, fields) {
            if (error) throw error;
            // On successful creation of project, create User(ergo client)

        });
        con.query('SELECT count(*) as count FROM project_details', function(error, results, fields){
            if (error) throw error;
            proj_count = results[0].count;
            console.log(proj_count);
            assn = {
                Project_ID: parseInt(proj_count),
                ur_emailID: req.body.email,
                ar_EmailID: req.body.arch_id
            };
            console.log(assn);
            con.query("INSERT INTO project_assn SET ? ", assn, function (error, results, fields) {
                if (error) throw error;
                // On successful creation of project, create User(ergo client)
            });
        });
    }
    else if(role == "Architect"){
        user = {
            ar_EmailID : req.body.email,
            password: hash,
            Admin_added: req.body.admin_id
        }
    }
    else{
        return res.status(400).send({ error:true, message: 'Please provide appropriate user role' });
    }

    console.log(hash.length);
    // this user object would be stored in the db

    // this is the email in html form that would be sent to the user
    var html;

    html = '<h4>Welcome to Techviz</h4>' +
                '<div>' +
                    '<p><b>Below are your credentials:</b><br/><br/>'
                        + 'Email: ' + req.body.email + '</p>' +
                    '<p>Password: ' + password_plaintext + '</p>' +
                '</div>';

    if (!user) {
        return res.status(400).send({ error:true, message: 'Please provide user' });
    }

    con.query("INSERT INTO " + role + " SET ? ", user, function (error, results, fields) {
        if (error) throw error;
        return res.send({ error: false, data: results, message: 'New ' + role + ' has been created successfully.' });
    });

        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.email_id, // from process.env
                pass: process.env.email_pass  // from process.env
            }
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: '"No-Reply @Techviz" <no-reply@techviz.com>', // sender address
            to: req.body.email, // list of receivers
            subject: 'Welcome to Techviz', // Subject line
            text: 'Hi,', // plain text body
            html: html // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });
});

// Authenticate user/admin/architect
app.post('/login', function(req, res){

    console.log('login is called');
    var date = new Date();
    // calculating hash, then compare it to the entry in db
    // if user found respond with a jwt token
    //console.log(req.body);
    var email = req.body.email;
    var role = req.body.role;
    let id;
    var user;
    var sql;
    console.log(req.body);
    if (role == undefined || role == null){
        return res.status(400).send({ error:true, message: 'Please provide user role' });
    }
    else if( role =="Admin"){
        user = {
            ad_EmailID : req.body.email
        }
        sql = "SELECT * FROM " + role + " WHERE `ad_emailID` = ?";
    }
    else if( role == "User"){
        user = {
            ur_EmailID : req.body.email
        }
        sql = "SELECT * FROM " + role + " WHERE `ur_emailID` = ?";
    }
    else if(role == "Architect"){
        user = {
            ar_EmailID : req.body.email
        }
        console.log(user);
        sql = "SELECT * FROM " + role + " WHERE `ar_emailID` = ?";
    }
    else{
        return res.status(400).send({ error:true, message: 'Please provide appropriate user role' });
    }

        //console.log(user);

        con.query(sql, email, function (error, results, rows) {
            if (error) throw error;

            var cert = fs.readFileSync('private_key.pem');
                    var user_data = {
                        email: email,
                        role: role,
                    };
            var token = jwt.sign(user_data, cert, { algorithm: 'RS256'});
            var hash = bcrypt.compareSync(req.body.password, results[0].password);
            if (hash){
                return res.send({ error: false,token: token, message: 'Login successful' });
            }
            else{
                return res.send({ error: true, message: 'Login failed' });
            }
        });
});

app.listen(process.env.PORT || 3001);
