//jshint esversion:6

require('dotenv').config();
const express = require ("express");
const bodyParser = require ("body-parser")
const ejs = require ("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
const md5 = require("md5");

//+++connect to the database and create new one caled userDB+++
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});

//+++create new user schema for database+++
const userSchema = new mongoose.Schema({
    email:String,
    password:String
});

//+++and this encrypting of the schema have to be plugin before creating new mongoose schema+++
//userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]});

//+++new user model for using database+++
const User = new mongoose.model("User", userSchema);

//+++express const creation+++
const app = express();
const port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:true
}));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    User.findOne({email:req.body.username, password:md5(req.body.password)}, function(err, result){
        if(!result){
            User.create({email:req.body.username, password:md5(req.body.password)}, function(err){
                if(!err){
                    res.render("secrets");
                } else {
                    console.log(err);
                }
            });
        } else {
            res.send("Your password already exits");
        }
    });
});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = md5(req.body.password);

    User.findOne({email:username}, function(err, result){
        if(err){
            console.log(err);
        } else {
            if(result){
                if(result.password === password){
                    res.render("secrets");
                }
            }
        }
    });
});

app.listen(port, function(){
    console.log("We are running at port " + port);
});