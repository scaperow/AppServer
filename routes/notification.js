var express = require('express');
var router = express.Router();
var user = require('../models/userService');
var notification = require('../models/notificationService');
var logger = require('log4js').getLogger('notification');

router.post('/send', function (req, res) {
//    var user = req.user || {username: ''};
//    if (user.username === '张宏伟') {
    notification.sendNotification(req.body.lineID,req.body.lineTag, req.body.testRoom, req.body.category, req.body.message, function (err, result) {
        if (err) {
            logger.error(err);
            res.render("notification", {title: 'Error', result: err});
        } else {
            logger.info('Sendno: ' + result.sendno);
            logger.info('Msg_id: ' + result.msg_id);
            res.render("notification", {title: 'Send a notice', result: 'Send success'});
        }
    });
});

router.get('/send', function (req, res) {
//    var user = req.user || {username: ''};
//    if (user.username === '张宏伟') {
    res.render('notification', {title: 'Send a notice', result: ''});
});

module.exports = router;