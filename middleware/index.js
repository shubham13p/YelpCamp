var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");


var middlewareObject = {
    isLoggedIn: function() {},
    checkCampgroundOwnership: function() {},
    checkCommentOwnership: function() {},
    isAdmin: function() {},
    isSafe: function() {}
}



middlewareObject.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Sorry you need to be logged in first to do that");
    res.redirect("/login");
}

middlewareObject.checkCampgroundOwnership = function(req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id, function(err, foundCampground) {
            // console.log(foundCampground.author.id);
            // console.log(req.user._id);
            if (err || !foundCampground) {
                req.flash("error", "campground not found");
                res.redirect("back")
            }
            else {
                if(!foundCampground){
                    req.flash("error","campground not found");
                    return res.redirect("back");
                }
                if (foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
                    req.campground = foundCampground;
                    next();
                }
                else {
                    // after login check
                    console.log("no")
                    req.flash("error", "you dont have permission to do that");
                    res.redirect("back");
                }
            }
        })
    }
    else {
        // before login check
       // console.log("no permission")
        req.flash("error", "You need to be logged in to do that")
        res.redirect("back");
    }
}


middlewareObject.checkCommentOwnership = function(req, res, next) {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if (err || !foundComment) {
                console.log(err);
                req.flash('error', 'Sorry, that comment does not exist!');
                res.redirect("back")
            }
            else {
                if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                    req.comment = foundComment;
                    next();
                }
                else {
                    // after login check
                    console.log("no")
                    req.flash("error", "you dont have permission to do that");
                    res.redirect("back");
                }
            }
        })
    }
    else {
        // before login check
      //  console.log("no permission")
        req.flash("error", "you need to be login first");
        res.redirect("back");
    }
}


middlewareObject.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id) || req.user.isAdmin) {
                    req.comment = foundReview;
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObject.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};


middlewareObject.isAdmin = function(req,res,next){
    if(req.user.isAdmin) {
      next();
    } else {
      req.flash('error', 'This site is now read only');
      res.redirect('back');
    }
};

middlewareObject.isSafe = function(req, res, next) {
    // console.log(req.body);
    
    if(req.body.image.match(/^https:\/\/images\.unsplash\.com\/.*/) || req.body.image.match(/[a-zA-Z]{1,}\-[a-zA-Z]{1,}\-[0-9]{1,}\-unsplash\.jpg/)) {
      return next();
    }else {
      req.flash('error', 'Only images from images.unsplash.com allowed.\nSee https://youtu.be/Bn3weNRQRDE for how to copy image urls from unsplash.');
      res.redirect('back');
    }
  };


module.exports = middlewareObject;
