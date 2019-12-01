//jshint esversion:6

require('dotenv').config();
const express = require ("express");
const bodyParser = require ("body-parser")
const ejs = require ("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//+++express const creation+++
const app = express();
const port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//+++connect to the database and create new one caled userDB+++
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

//+++create new user schema for database+++
const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//+++and this encrypting of the schema have to be plugin before creating new mongoose schema+++
//userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]});

//+++new user model for using database+++
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
 
passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

//OAuth Google
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login"}),
  function(req, res) {
    // Successful authentication, redirect to the secrets.
      res.redirect("/secrets");
});  

app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne:null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    } else {
      if (foundUsers){
        res.render("secrets", {
          usersWithSecrets:foundUsers
        });
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
      if(err){
        console.log(err);
      } else {
        if (foundUser){
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
   });
  
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });
  });

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});  

app.post("/login", function(req, res){

    const user = new User ({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

});

app.listen(port, function(){
    console.log("We are running at port " + port);
});