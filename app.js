//jshint esversion:6
require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
// const encrypt = require("mongoose-encryption") // 1/ Authentication with encryption key and environment variable
// const md5 = require('md5') // 2/ Authentication with hash function
// const bcrypt = require('bcrypt') // 3/ Hashing and salting password
// 4/ Cookies and session
const session = require('express-session')
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

// const saltRounds = 10 // 3/ Hashing and salting password

const app = express()

app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
  extended: true
}))

// 4/ Cookies and session
app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
})

const userSchema = new mongoose.Schema({
  email: String,
  password: String
})

// 1/ Authentication with encryption key and environment variable
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"]
// })

// 4/ Cookies and session
userSchema.plugin(passportLocalMongoose)

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.get('/', function(req, res) {
  res.render("home")
})

app.route('/register')

  .get(function(req, res) {
    res.render("register")
  })

  .post(function(req, res) {

    // 4/ Cookies and session
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err)
        res.redirect("/register")
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets")
        })
      }
    })

    // console.log(req.body.password)
    //
    // // 3/ Hashing and salting password
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //
    //   console.log(hash)
    //
    //   const user = new User({
    //     email: req.body.username,
    //     // password: req.body.password  // 1/ Authentication with encryption key and environment variable
    //     // password: md5(req.body.password) // 2/ Authentication with hash function
    //     password: hash // 3/ Hashing and salting password
    //   })
    //   user.save(function(err) {
    //     if (!err) {
    //       res.render("secrets")
    //     } else {
    //       console.log(err)
    //     }
    //   })
  })

// 4/ Cookies and session
app.route('/secrets')

  .get(function(req, res) {

    if (req.isAuthenticated()) {
      res.render("secrets")
    } else {
      res.redirect("/login")
    }

  })

// 4/ Cookies and session
app.route('/login')

  .get(function(req, res) {
    res.render("login")
  })

  .post(function(req, res) {

    const user = new User({
      username: req.body.username,
      password: req.body.password
    })

    req.login(user, function(err) {
      if (err) {
        console.log(err)
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets")
        })
      }
    })

    // const username = req.body.username
    // const password = req.body.password
    //
    // User.findOne({
    //   email: username
    // }, function(err, foundUser) {
    //
    //   if (err) {
    //     console.log(err)
    //   } else {
    //     // if (foundUser.password === md5(req.body.password)) { // 2/ Authentication with hash function
    //     // 3/ Hashing and salting password
    //     bcrypt.compare(password, foundUser.password, function(err, result) {
    //       if (result === true) {
    //         res.render("secrets")
    //       }
    //     })
    //   }
    // })
  })

app.route('/logout')

  .get(function(req, res) {
    req.logout();
    res.redirect('/');
  })

app.listen(3000, function() {
  console.log("Server started on port 3000")
})
