var express = require('express');
var router = express.Router();
var user = require('../models/userService');
var _ = require("underscore");
var logger = require("log4js").getLogger("login");

/* GET users listing. */
router.post('/', function (req, res) {
    user.getUserByName(req.body.userName, req.body.password, function (err, userID) {
        if (err) {
            logger.error(err);
            return res.send({error: '服务器发生异常, 请稍后再试'});
        }

        if (userID) {
            //if login successfully, send back the user's information
            user.getUserInfo(userID, function (err, result) {
                if (err) {
                    logger.error(err);
                    return res.status(500).end();
                }

                res.status(200).json(result);
            });

        } else {
            res.status(404).end();
        }
    });
});

router.get("/", function (req, res) {
    user.getUserByName(req.query.userName, req.query.password, function (err, userID) {
        if (err) {
            logger.error(err);
            return res.send({error: err});
        }

        if (userID) {
            //if login successfully, send back the user's information
            user.getUserInfo(userID, function (err, result) {
                if (err) {
                    logger.error(err);
                    return res.status(500).send(err);
                }

                res.status(200).json(result);
            });

        } else {
            res.status(404).end();
        }
    });
});

router.get('/:phone', function (req, res) {
    user.sendVCode(req.params.phone, function (err, result) {
        if (err) {
            logger.error(err);
            return res.status(500).send(err);
        }

        res.status(200).send(result);
    });
});

module.exports = router;
