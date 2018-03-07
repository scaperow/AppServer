var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var index = require('./routes/index');
var user = require('./routes/user');
var msg = require('./routes/message');
var tip = require('./routes/tinyTip')
var login = require('./routes/login');
var line = require('./routes/line');
var report = require('./routes/report');
var statistics = require('./routes/statistics');
var userService = require('./models/userService');
var notification = require('./routes/notification');
var testRoom = require('./routes/testRoom');
var device = require('./routes/device');
var log4js = require('log4js');
var connect = require('connect');
var log = log4js.getLogger("app");
var sql = require('./lib/sql');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public 
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
log4js.configure("config/log4js.json");

passport.use(new BasicStrategy(
    function (userID, password, done) {
        userService.getUserByID(userID, password, function (err, result) {
            if (err) {
                log.error(err);
            }

            if (result) {
                return done(null,
                    {
                        username: userID,
                        password: password
                    });
            } else {
                return done(null, false);
            }
        });
    }
));

app.use(express.static(__dirname + '/www'));
app.use(express.static(__dirname + '/bower_components'));
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'client')));
app.use(passport.initialize());
app.use('/', index);
app.use('/login', login);
app.use('/user', user);
app.use('/line', line);
app.use('/switch', passport.authenticate('basic', {session: false}), user);
app.use('/notification', notification);
app.use('/msg', msg);
app.use('/testroom', testRoom);
app.use('/statistics', statistics);
app.use('/device', device);
app.use('/tip', tip);
app.use('/report', report);
app.use(function (err, req, res, next) {
    log.error(err);
    res.status(err.status || 500);
    next(req, res);
});

//sql.query('SELECT * FROM app_message WHERE ID = 4349', function (err, result) {
//    if (err) {
//        return console.log(err);
//    }
//
//    console.log(result);
//});

var server = app.listen(9311, function () {
    log.info('Listening on port %d', server.address().port);
});
module.exports = app;
