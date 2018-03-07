var express = require('express');
var router = express.Router();
var user = require('../models/userService');
var notification = require('../models/userService');
var logger = require("log4js").getLogger("sql");


router.get('/users', function (req, res) {
    res.render('users', {title: '人员信息维护'});
});

router.get('/:userID', function (req, res) {
    user.getUserInfo(req.params.userID, function (err, userInfo) {
        if (err) {
            logger.error(err);
            return res.status(500).send(err);
        }

        if (user) {
            res.status(200).json(userInfo);
        } else {
            res.status(400);
        }
    });
});

router.get("/:userID/:userName/:lineID", function (req, res) {
    user.getLineInfo(req.params.userID, req.params.userName, req.params.lineID, function (err, result) {
        if (err) {
            logger.error(err);
            return res.status(500);
        }

        if (result) {
            res.status(200).json(result);
        } else {
            res.status(400);
        }
    });
});

router.post('/resetPassword', function (req, res) {
    user.resetPassword(req.body.userID, req.body.oldPassword, req.body.newPassword, function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        return res.send(result);
    });
});

module.exports = router;
