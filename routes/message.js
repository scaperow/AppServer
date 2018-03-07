var express = require('express');
var router = express.Router();
var msg = require('../models/messageService');
var logger = require('log4js').getLogger('message');

router.get("/:lineID/:userID/:msgID/:category", function (req, res) {
    msg.getAllMessage(req.params.lineID, req.params.userID, req.params.msgID, req.params.category, function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        res.send(result);
    });
});

router.get("/:lineID/:testRoomCode/:msgID/:category", function (req, res) {
    msg.getSpecailMessage(req.params.lineID, req.params.testRoomCode, req.params.msgID, req.params.category, function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        res.send(result);
    });
});

router.get("/rest/:lineID/:userID/:msgID/:category", function (req, res) {
    msg.getRestOfMessage(req.params.lineID, req.params.userID, req.params.msgID, req.params.category, function (err, result) {
        if (err) {
            logger.error(err);
        }

        res.send(result);
    });
});

module.exports = router;