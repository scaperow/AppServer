var express = require('express');
var router = express.Router();
var statisticsService = require('../models/statisticsService');
var notification = require('../models/userService');
var logger = require("log4js").getLogger("device");


router.get('/doc/company/:code/:lineID/:startTime/:endTime', function (req, res) {
    statisticsService.documentForCompany(req.params.lineID
        , req.params.startTime
        , req.params.endTime
        , req.params.code
        , function (err, result) {
            if (err) {
                return res.send({error: err});
            }

            res.send(result);
        });
});

router.get('/doc/testRoom/:code/:lineID/:startTime/:endTime', function (req, res) {
    statisticsService.documentForTestRoom(req.params.lineID
        , req.params.startTime
        , req.params.endTime
        , req.params.code
        , function (err, result) {
            if (err) {
                return res.send({error: err});
            }

            res.send(result);
        });
});

module.exports = router;
