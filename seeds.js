var mongoose = require("mongoose"),
    Campground = require("./models/campground"),
    Comment = require("./models/comment");


var data = [{
    name: "Cloud's Rest",
    image: "https://farm4.staticflickr.com/3795/10131087094_c1c0a1c859.jpg",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio eos autem necessitatibus consectetur dignissimos numquam voluptatem aperiam neque perferendis, repellendus sequi provident quisquam ea perspiciatis voluptatibus quasi. Similique, sapiente commodi!",
    author: {
        id: "5cb52b04d7bf2f0fb3265e1e",
        username: "Tom"
    }
}, {
    name: "Canyon Floor",
    image: "https://farm1.staticflickr.com/189/493046463_841a18169e.jpg",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio eos autem necessitatibus consectetur dignissimos numquam voluptatem aperiam neque perferendis, repellendus sequi provident quisquam ea perspiciatis voluptatibus quasi. Similique, sapiente commodi!",
    author: {
        id: "5cb529a0e011d60f6cb46d95",
        username: "Jerry"
    }
}]

var cmt = [{
    text: "This place is great, but I wish there was internet",
    author: "ABC"
}, {
    text: "Tlorem lorem lorem",
    author: "QWE"
}, {
    text: "lovely",
    author: "ZXC"
}]

function seedDB() {
    Comment.deleteMany({}, function(err) {
        if (err) {
            console.log(err);
        }
        console.log("removed comments!");

        Campground.deleteMany({}, function(err) {
            if (err) {
                console.log(err);
            }
            else {
                console.log("removed campgrounds!");
                

                data.forEach(function(seed) {
                    Campground.create(seed, function(err, newcampground) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            console.log("added a campground");
                            console.log(newcampground);
                        }
                    });
                });
                setTimeout(addcmt, 1000);
            }
        });
    });
}

function addcmt() {
    cmt.forEach(function(eachcmmt) {
        Comment.create(eachcmmt, function(err, commentwithid) {
            Campground.find({}, function(err, foundCamp) {
                foundCamp.forEach(function(eachcampname) {
                    eachcampname.comments.push(commentwithid);
                    eachcampname.save(function(err, data) {
                        if (err) console.log(err);
                        else console.log(data);
                    })
                })
            })
        })
    })
}

module.exports = seedDB;

// out of sync code to sync code i.e Campgrounds removed -> Comments removed -> Campground created -> Comment created -> comment added to camp -> Comment created
// -> comment added to camp -> Comment created -> comment added to camp -> Campground created -> Comment created -> comment added to camp

// var mongoose = require("mongoose"),
//     Campground = require("./models/campground"),
//     Comment = require("./models/comment");


// var seeds = [{
//     name: "Cloud's Rest",
//     image: "https://farm4.staticflickr.com/3795/10131087094_c1c0a1c859.jpg",
//     description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio eos autem necessitatibus consectetur dignissimos numquam voluptatem aperiam neque perferendis, repellendus sequi provident quisquam ea perspiciatis voluptatibus quasi. Similique, sapiente commodi!",
//     author: {
//         id: "5cb52b04d7bf2f0fb3265e1e",
//         username: "Tom"
//     }
// }, {
//     name: "Canyon Floor",
//     image: "https://farm1.staticflickr.com/189/493046463_841a18169e.jpg",
//     description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio eos autem necessitatibus consectetur dignissimos numquam voluptatem aperiam neque perferendis, repellendus sequi provident quisquam ea perspiciatis voluptatibus quasi. Similique, sapiente commodi!",
//     author: {
//         id: "5cb529a0e011d60f6cb46d95",
//         username: "Jerry"
//     }
// }]

// var seedscmts = [{
//     text: "This place is great, but I wish there was internet",
//     author: "ABC"
// }, {
//     text: "Tlorem lorem lorem",
//     author: "QWE"
// }, {
//     text: "lovely",
//     author: "ZXC"
// }]

// async function seedDB() {
//     try {
//         await Campground.remove({});
//         console.log('Campgrounds removed');
//         await Comment.remove({});
//         console.log('Comments removed');

//         for (const seed of seeds) {
//             let campground = await Campground.create(seed);
//             console.log('Campground created');

//             for (const seedscmt of seedscmts) {
//                 let newcomment = await Comment.create(seedscmts);

//                 console.log('Comment created');

//                 campground.comment = newcomment;
//                 campground.save();
//                 console.log("comment added to camp")
//             }
//         }
//     }
//     catch (err) {
//         console.log(err);
//     }
// }

// module.exports = seedDB;
