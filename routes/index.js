var express = require("express");
var router = express.Router({ mergeParams: true });
var passport = require("passport");
var User = require("../models/user");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

var { promisify } = require('util');
var sizeOf = promisify(require('image-size'));

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function(req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
    // req.flash("error","sorry only jpg | jpeg | png allow");
    //res.redirect("/campgrounds");
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
// var upload = multer({ storage: storage, fileFilter: imageFilter })
var upload = multer({ storage: storage, fileFilter: imageFilter })

var cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'mycloudsap',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/", function(req, res) {
  res.render("landing");
});

router.get("/register", function(req, res) {
  res.render("register", { page: 'register' });
});

router.get("/login", function(req, res) {
  res.render("login", { page: 'login' });
});

router.post("/register", upload.single('avatar'), async function(req, res) {
  var imgWH = [];
  imgWH = await sizeOf(req.file.path);
  if (imgWH.width < imgWH.height || req.file.size > 5e+6) {
    req.flash("error", "Please upload only landscape image or image size should be less than 5MB");
    res.redirect("back");
  }
  else {
    let waitforupload = await cloudinary.v2.uploader.upload(req.file.path);
    

    var newUser = new User({
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      avatar: waitforupload.secure_url,
      avatarId: waitforupload.public_id,
      bio: req.body.bio
    })

    console.log("eeewqqewe233313" + newUser);
    if (req.body.adminCode === 'secretcode123') {
      newUser.isAdmin = true;
    }

    User.register(newUser, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        // req.flash("error", err.message);
        return res.render("register", { "error": err.message + " kindly choose other" });
      }
      else {
        passport.authenticate("local")(req, res, function() {
          console.log(req.body.username);
          req.flash("success", "Welcome to YelpCamp " + user.username);
          return res.redirect("/campgrounds");
        })
      }
    })

  }
})

router.post("/login", passport.authenticate("local", {
  // req.flash("success", "Welcome to YelpCamp " + req.body.username); // user.username);
  successRedirect: "/campgrounds",
  failureRedirect: "/login",
  failureFlash: "creditials are wrong or creditials are not found in system",
  successFlash: "Welcome again"
}), function(req, res) {})

router.get("/logout", function(req, res) {
  req.logout();
  req.flash("success", "good bye")
  res.redirect("/login");
})

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'udemy13p@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'udemy13p@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', { token: req.params.token });
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if (req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        }
        else {
          req.flash("error", "Passwords do not match.");
          return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'udemy13p@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'udemy13p@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});


module.exports = router
