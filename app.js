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
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
// 5/ Oauth authentication
const GoogleStrategy = require("passport-google-oauth20").Strategy
const FacebookStrategy = require("passport-facebook").Strategy
const findOrCreate = require("mongoose-findorcreate")

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
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
})

// 1/ Authentication with encryption key and environment variable
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"]
// })

// 4/ Cookies and session
userSchema.plugin(passportLocalMongoose)

// 5/ Oauth authentication
userSchema.plugin(findOrCreate)

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())

// passport.serializeUser(User.serializeUser())
// passport.deserializeUser(User.deserializeUser())

// 5/ Oauth authentication: user (de)serialization must comprise another strategy than the local one
passport.serializeUser(function(user, done) {
  done(null, user.id);
})

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user)
  })
})

// 5/ Oauth authentication
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    profileFields: ["emails"]
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile)

    const googleId = profile.id
    const email = profile.emails[0].value

    User.findOrCreate({
      googleId: googleId
    }, {
      email: email
    }, function(err, user) {

      return cb(err, user)
    })
  }
))

passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ["emails"]
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile)

    const facebookId = profile.id
    const email = profile.emails[0].value

    User.findOrCreate({
      facebookId: facebookId
    }, {
      email: email
    }, function(err, user) {

      return cb(err, user)
    })
  }
))

// 4/ Cookies and session
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

app.route("/login")

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

// 5/ Oauth authentication
app.route("/auth/google")

  .get(passport.authenticate(
    "google", {
      scope: ["profile", "email"]
    }))

app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets")
  })

app.route("/auth/facebook")

  .get(passport.authenticate("facebook", {
    scope: ["email"]
  }))

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets")
  })

// 4/ Cookies and session
app.route("/secrets")

  .get(function(req, res) {

    User.find({
      "secret": {
        $ne: null
      }
    }, function(err, foundUsers) {

      if (err) {
        console.log(err)
      } else {

        if (foundUsers) {
          // console.log(foundUsers)

          res.render("secrets", {
            usersWithSecrets: foundUsers
          })
        }
      }
    })
  })

app.route("/submit")

  .get(function(req, res) {

    if (req.isAuthenticated()) {
      res.render("submit")
    } else {
      res.redirect("/login")
    }
  })

  .post(function(req, res) {

    const submittedSecret = req.body.secret

    User.findById(req.user.id, function(err, foundUser) {

      if (err) {
        console.log(err)
      } else {

        if (foundUser) {
          foundUser.secret = submittedSecret
          foundUser.save(function() {
            res.redirect("/secrets")
          })
        }
      }
    })
  })

app.route("/logout")

  .get(function(req, res) {
    req.logout();
    res.redirect('/');
  })

app.listen(3000, function() {
  console.log("Server started on port 3000")
})
