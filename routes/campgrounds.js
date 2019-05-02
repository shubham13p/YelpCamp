var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware/index");
var Review = require("../models/review");
var { promisify } = require('util');
var sizeOf = promisify(require('image-size'));

var NodeGeocoder = require('node-geocoder');

var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    R_apiKey: process.env.R_GEOCODER_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);
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
    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({ name: regex }, function(err, allCampgrounds) {
            if (err) {
                console.log(err);
            }
            else {
                if (allCampgrounds.length < 1) {
                    noMatch = "No campgrounds match that query, please try again.";
                }
                //            res.render("campgrounds/index",{campgrounds: allCampgrounds });
                // console.log(Campgrounds)
                res.render("campgrounds/index", { campgrounds: allCampgrounds, page: 'campgrounds', noMatch: noMatch });

            }
        });
    }
    else {
        Campground.find({}, function(err, allCampgrounds) {
            if (err) {
                console.log(err);
            }
            else {
                // console.log(allCampgrounds);
                res.render("campgrounds/index", { campgrounds: allCampgrounds, page: 'campgrounds', noMatch: noMatch });
            }
        });
    }
});

router.post("/", middleware.isLoggedIn, upload.array('image', 12), async function(req, res) {

    // console.log(req.body);

    var img = [];
    var imgId = [];
    var imagearray = [];
    imagearray = req.files;
    var total_img_size = 0;
    var imgWH = [];
    console.log(req.files)
    console.log("3333333333" + JSON.stringify(req.files))

    console.log(req.files[0].originalname);


    // if (!req.files[0].originalname.match(/[a-zA-Z]{1,}\-[a-zA-Z]{1,}\-[0-9]{1,}\-unsplash\.jpg/)){ console.log("false"); }
    // else { console.log("true"); }



    if (req.files.length > 5) {
        req.flash("error", "Please Upload Less Than 5 Image ");
        console.log("image uploaded was more than 5");
        return res.redirect('back');
    }
    else {
        for (var i = 0; i < req.files.length; i++) {
            imgWH = await sizeOf(req.files[i].path);
            total_img_size += req.files[i].size;
            if (imgWH.width < imgWH.height) {
                req.flash("error", "Please upload only landscape image");
                console.log("image uploaded was not landscape");
                return res.redirect("back");
            }
        }
    }

    if (total_img_size >= 2e+7) {
        req.flash('error', 'The Total Size Of All Image Should Be less Than 20 MB');
        console.log("image uploaded was not within 20MB");
        return res.redirect("back");
    }
    else {
        for (var i = 0; i < req.files.length; i++) {
            if (!req.files[i].originalname.match(/[a-zA-Z0-9\-]{1,}\-unsplash\.jpg/)) {
                req.flash('error', 'Only images downloaded from images.unsplash.com allowed.');
                console.log("image uploaded was different from unsplash")
                return res.redirect("back");
            }
        }
    }


    for (var i = 0; i < imagearray.length; i++) {
        //  console.log(imagearray[i].path);
        let waitforupload = await cloudinary.v2.uploader.upload(imagearray[i].path) //, function(error, result) {
        console.log(waitforupload.secure_url);
        console.log(waitforupload.public_id);
        console.log(waitforupload);
        console.log("================")
        img.push(waitforupload.secure_url);
        imgId.push(waitforupload.public_id);
    }

    var name = req.body.name;
    var price = req.body.price;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var lat;
    var lng;
    var location;

    await geocoder.geocode(req.body.location, function(err, data) {
        console.log("error: " + err)
        if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
        }
        lat = data[0].latitude;
        lng = data[0].longitude;
        location = data[0].formattedAddress;
    })
    var newCampground = { name: name, price: price, image: img, imageId: imgId, description: desc, author: author, location: location, lat: lat, lng: lng }
    // console.log("2323"+JSON.stringify(newCampground));
    // console.log("456789" + newCampground.image[1])
    Campground.create(newCampground, function(err, newlyCreated) {
        if (err) {
            console.log(err);
        }
        else {
            console.log(newlyCreated);
            res.redirect("/campgrounds");
        }
    });

});



router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new");
});

router.get("/:id", function(req, res) {
    console.log(req.params.id);

    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } }
    }).exec(function(err, foundCampground) {
        if (err) {
            console.log(err);
        }
        else {
            //render show template with that campground
            if (!foundCampground) {
                req.flash("error", "campground not found");
                return res.redirect("/campgrounds");
                // return res.status(400).send("items not found")
            }
            Campground.find({}, function(err, allCampgrounds) {
                console.log(foundCampground);
                res.render("campgrounds/show", { campground: foundCampground, allCampgrounds });
            });
        }
    });
})

router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        if (err) {
            req.flash("error", "campground not found");
            return res.redirect("/campgrounds");
        }
        res.render("campgrounds/edit", { campground: foundCampground });
    })
})


router.put("/:id", middleware.checkCampgroundOwnership, upload.array('image', 12), async function(req, res) {
    // router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res) {
    var total_img_size = 0;
    var imgWH = [];
    var img = [];
    var imgId = [];
    var imagearray = [];

    Campground.findById(req.params.id, async function(err, campground) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        }

        else {
            console.log(campground.image.length)
            if (req.files.length) {

                if (req.files.length > 5) {
                    req.flash("error", "Please Upload Less Than 5 Image ");
                    console.log("image uploaded was more than 5");
                    return res.redirect('back');
                }
                else {
                    for (var i = 0; i < req.files.length; i++) {
                        imgWH = await sizeOf(req.files[i].path);
                        total_img_size += req.files[i].size;
                        if (imgWH.width < imgWH.height) {
                            req.flash("error", "Please upload only landscape image");
                            console.log("image uploaded was not landscape");
                            return res.redirect("back");
                        }
                    }
                }
                if (total_img_size >= 2e+7) {
                    req.flash('error', 'The Total Size Of All Image Should Be less Than 20 MB');
                    console.log("image uploaded was not within 20MB");
                    return res.redirect("back");
                }
                else {
                    for (var i = 0; i < req.files.length; i++) {
                        if (!req.files[i].originalname.match(/[a-zA-Z0-9\-]{1,}\-unsplash\.jpg/)) {
                            req.flash('error', 'Only images downloaded from images.unsplash.com allowed.');
                            console.log("image uploaded was different from unsplash")
                            return res.redirect("back");
                        }
                    }
                }


                imagearray = req.files;
                for (var i = 0; i < campground.image.length; i++) {
                    await cloudinary.v2.uploader.destroy(campground.imageId[i]);
                }
                for (var i = 0; i < imagearray.length; i++) {
                    //  console.log(imagearray[i].path);
                    let waitforupload = await cloudinary.v2.uploader.upload(imagearray[i].path) //, function(error, result) {
                    console.log(waitforupload.secure_url);
                    console.log(waitforupload.public_id);
                    console.log("====+++++++++========")
                    img.push(waitforupload.secure_url);
                    imgId.push(waitforupload.public_id);
                }

                req.body.campground.image = img;
                req.body.campground.imageId = imgId;
            }
            await geocoder.geocode(req.body.campground.location, function(err, data) {
                // console.log(err)
                if (err || !data.length) {
                    req.flash('error', 'Invalid address');
                    return res.redirect('back');
                }
                req.body.campground.lat = data[0].latitude;
                req.body.campground.lng = data[0].longitude;
                req.body.campground.location = data[0].formattedAddress;
            })
            console.log(req.body.campground);

            console.log("2323" + JSON.stringify(req.body.campground));
            Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updateCampground) {
                if (err) {
                    console.log(err)
                    // res.redirect("back");
                }
                else {
                    req.flash("success", "Campground updated");
                    res.redirect("/campgrounds/" + req.params.id)
                }
            })
        }
    })
})


// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, campground) {
        if (err) {
            res.redirect("/campgrounds");
        }
        else {
            // deletes all comments associated with the campground
            Comment.deleteMany({ "_id": { $in: campground.comments } }, function(err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.deleteMany({ "_id": { $in: campground.reviews } }, function(err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.deleteOne();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    });
});


// SHOW - shows more info about one campground
router.get("/:id", function(req, res) {
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } }
    }).exec(function(err, foundCampground) {
        if (err) {
            console.log(err);
        }
        else {
            //render show template with that campground
            res.render("campgrounds/show", { campground: foundCampground });
        }
    });
});



function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};



module.exports = router;
