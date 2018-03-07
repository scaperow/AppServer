var express = require('express');
var router = express.Router();
var testRoom = require('../models/testRoomService');
var notification = require('../models/userService');
var logger = require("log4js").getLogger("testRoom");


router.get('/members/:lineID', function (req, res) {
    testRoom.getMembers(req.params.lineID, function (err, result) {
        if (err) {
            logger.error(err);
            return res.send({error: err});
        }

        res.send(result);
    });
});

router.get('/testRooms/:lineID', function (req, res) {
    testRoom.getTestRooms(req.params.lineID, function (err, result) {
        if (err) {
            logger.error(err);
            return res.send({error: err});
        }

        res.send(result);
    });
});

router.get('/doList/:userID/:lineID', function (req, res) {
    testRoom.getDoList(req.params.userID, req.params.lineID, function (err, result) {
        if (err) {
            logger.error(err);
            return res.send({error: err});
        }

        res.send(result);
    });
});

router.get('/userlist/:lineID', function (req, res) {
    testRoom.getUserList(req.params.lineID, function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        return res.send(result);
    });
});

router.post('/modifyuser', function (req, res) {
    testRoom.modifyUser(req.body.user, function (err) {
        if (err) {
            return res.send({error: err});
        }

        return res.send({});
    });
});

router.get('/information/:lineID/:testRoomCode', function (req, res) {
    testRoom.getInformation(req.params.lineID, req.params.testRoomCode, function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        return res.send(result);
    });
});

module.exports = router;
