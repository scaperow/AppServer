var express = require('express');
var router = express.Router();
var deviceService = require('../models/deviceService');
var notification = require('../models/userService');
var logger = require("log4js").getLogger("device");


router.get('/devices/:lineID', function (req, res) {
    deviceService.getDevices(req.params.lineID, function (err, result) {
        if (err) {
            logger.error(err);
            return res.status(500).send(err);
        }

        res.send(result);
    });
});


module.exports = router;
