var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var User = require("../models/user");
var middleware = require("../middleware");
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


router.get("/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if (err) {
      req.flash("error", "Something went wrong.");
      return res.redirect("/");
    }
    console.log("2233313" + foundUser);
    Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if (err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
      console.log(campgrounds);
      res.render("users/show", { user: foundUser, campgrounds: campgrounds });
    })
  });
});


router.get("/:id/edit", middleware.isLoggedIn, function(req, res) {
  res.render("edit profile");

  User.findById(req.params.id, function(err, foundUser) {
    if (err) {
      req.flash("error", "Something went wrong");
      return res.redirect("/");
    }
    else {
      console.log("fdfdffdf" + foundUser);
      res.render("users/edit", { foundUser: foundUser })
    }
  })
})

router.get("/:id/editProfile", middleware.isLoggedIn, function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    console.log(foundUser)
    res.render("users/edit", { foundUser: foundUser, page: "showProfile" })

  })
})

router.put("/:id", middleware.isLoggedIn, upload.single('avatar'), async function(req, res) {
  // console.log(req.body.user)
  var imgWH = [];
// console.log("232323"+req.file);
  User.findById(req.params.id, async function(err, foundUser) {
    if (err) {
      req.flash("error", err.message);
      res.redirect("back");
    }
    else {
      if (req.file) {
        imgWH = await sizeOf(req.file.path);

        if (imgWH.width < imgWH.height || req.file.size > 5e+6) {
          req.flash("error", "Please upload only landscape image or image size should be less than 5MB");
          res.redirect("back");
        }

        await cloudinary.v2.uploader.destroy(foundUser.avatarId);
        
        let waitforupload = await cloudinary.v2.uploader.upload(req.file.path);
          req.body.user.avatar = waitforupload.secure_url;
          req.body.user.avatarId = waitforupload.public_id;
      }
      User.findByIdAndUpdate(req.params.id, req.body.user, function(err, userUpdate) {
        if (err) {
          console.log(err);
          req.flash("error", "user not updated");
          res.render("campgrounds");
        }
        else {
          req.flash("success", "Profile Updated");
          res.redirect("/campgrounds");
        }
      })
    }

  })
})


router.get("/:id/showProfile", middleware.isLoggedIn, function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if (err) {
      console.log(err);
      req.flash("error", "something went wrong");
    }
    else {
      console.log(foundUser);
      res.render("users/showProfile", { foundUser: foundUser, page: "showProfile" })
    }
  })
})


module.exports = router;
