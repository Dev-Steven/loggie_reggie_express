var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var mongoose = require('mongoose');
var session = require('express-session');
var bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, './static')));

app.use(session({
    secret: 'keyboardkitteh',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}))

const flash = require('express-flash');

app.use(flash());

mongoose.connect('mongodb://localhost/log_reg');
mongoose.Promise = global.Promise;

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

// From future function
var fromFuture = function(birthday) {
    return birthday < Date.now();
}

// Making the Schema
const UserSchema = new mongoose.Schema({
    first_name: {type: String, required: [true, "First name is required."], minlength: 2},
 
    last_name: {type: String, required: [true, "Last name is required"], minlength: 2},

    email: {type: String, trim: true, lowercase: true, unique: true, required: "Email required", match: [/^\w+([.-]?\w+)@\w+([.-]?\w+)(.\w{2,3})+$/, "Please fill in a valid email address"]},
    
    birthday: {type: Date, required: [true, "A birthday is required."], validate: [fromFuture, "Birthday must be valid."]},
     
    password: {type: String, required: [true, "Password is required"]}
}, {timesstamps: true});

const User = mongoose.model('User', UserSchema);

// Route Creation

app.get('/', function(req, res) {
    res.render('index')
})

app.post('/register', function(req, res) {
    console.log('registrating...');

    //checking for unique email
    User.find({email: req.body.email}, function(err, emails) {
        console.log("checking emails...")
        if(err) {
            console.log('something went wrong');
            redirect('/');
        }
        else if (emails.length == 0) {
            console.log("no matching emails");
        }
        else {
            console.log("email unavailable")
            flash('registration', 'That email already exits');
            
        }
    })

    if(req.body.password == req.body.confirm_pw) {
        console.log('passwords match')
        User.create({first_name: req.body.first_name, last_name: req.body.last_name, email: req.body.email, birthday: req.body.birthday, password: req.body.password}, function(err, user) {
            if(err) {
                console.log('error');
                for(var key in err.errors){
                    req.flash('registration', err.errors[key].message);
                }
                res.redirect('/');
            }
            else {
                req.session.id = user._id;
                req.session.name = user.first_name;
                console.log(req.session.id)
                console.log(req.session.name)              
                var hashed_password = bcrypt.hash(req.body.password, 10)
                .then(hashed_password => {
                    console.log('password is hashed', hashed_password);
                    user.password = hashed_password;
                    user.save()
                    console.log('reg complete, nice!', user);
                    res.redirect('/success')
                })
                .catch(error => {
                    console.log('problem hashing password');
                    res.redirect('/');
                })
            }
        })
    }
    else {
        req.flash("registration","passwords don't match")
        console.log("passwords don't match");
        res.redirect('/')
    }
})

app.post('/login', function(req, res) {
        console.log(req.body);
    if (req.body.email == null){
        console.log("null email");
        req.flash('login','fields cant be empty');
    }

    if (req.body.password == null){
        console.log("null password");
        req.flash('login',"All fields are required")
    }

    User.findOne({email: req.body.email}, function(err, user) {

        if(err) {
            console.log("email does not exist.")
            redirect('/');
        }

        else {
            bcrypt.compare(req.body.password, user.password, function(err, valid_pw) {
                if(err) {   
                    console.log('something went wrong');
                }
                else if (valid_pw == false) {
                    console.log("bcrypt:",valid_pw)
                    console.log(req.body.password);
                    console.log(user.password);
                    req.flash('login', 'incorrect information');
                    res.redirect('/');
                }
                else {
                    console.log(valid_pw)
                    console.log(user.password);
                    console.log(user.email);
                    req.session.emmail = user.email;
                    res.redirect('/success')
                }
            })
        }
    })
})

app.get('/success', function(req, res) {
    res.render('success')
})

app.listen(8000, function() {
    console.log('listening on port 8000');
})

