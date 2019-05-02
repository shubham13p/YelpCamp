var express = require("express");
var router = express.Router({ mergeParams: true });
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware");




router.get("/new", middleware.isLoggedIn, function(req, res) {
    console.log(req.params.id);


    Campground.findById(req.params.id, function(err, campground) {
        if (err) { console.log(err) }
        else {
            console.log("#####################")
            console.log(campground);
            res.render("comments/new", { campground: campground });
        }
    })
})


router.post("/", middleware.isLoggedIn, function(req, res) {
    Campground.findById(req.params.id, function(err, campground) {
        if (err) {
            console.log(err);
            res.redirect("/campgrounds");
        }
        else {
            console.log(req.body.comment);
            Comment.create(req.body.comment, function(err, comment) {
                if (err) {
                    req.flash("error", "Something went wrong");
                    console.log(err);
                }
                else {

                    console.log("$$$$" + req.user);
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    campground.comments.push(comment);
                    campground.save();
                    // console.log("5555555" + comment)
                    req.flash("success", "Successfully added comment");
                    res.redirect('/campgrounds/' + campground._id);
                }
            });
        }
    });
})

router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res) {
    //  console.log("campcomment" + req.params.comment_id);
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if (err) {
            console.log(err)
            res.redirect("back");
        }
        else {
            // console.log("POPPO"+foundComment);
            // console.log("OPPO"+req.params.id);
            res.render("comments/edit", { campground_id: req.params.id, comment: foundComment })
        }
    })
})

router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res) {
    //  console.log("231313213" + req.body.comment.text);

    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updateComment) {
        if (err) {
            console.log(err);
            res.redirect("back");
        }
        else {
            req.flash("success", "Successfully updated comment");
            res.redirect("/campgrounds/" + req.params.id);
        }

    })
})

router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res) {
    console.log(req.params.id);

    Campground.findById(req.params.id, function(err, foundCampground) {
        if (err) { console.log(err); }
        console.log("found" + foundCampground);
        foundCampground.comments.pull(req.params.comment_id);
        foundCampground.save();

        Comment.findByIdAndRemove(req.params.comment_id, function(err) {
            if (err) { console.log(err) }
            else {
                req.flash("success", "Comment deleted");
                res.redirect("/campgrounds/" + req.params.id)
            }
        })
    })

})



module.exports = router;
