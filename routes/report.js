var express = require('express');
var router = express.Router();
var report = require('../models/reportSerive');
var logger = require('log4js').getLogger('report');

router.get("/:userID/:TypeID/:maxID/:lineID", function (req, res) {
    report.getCurrData(req.params.userID,req.params.TypeID,req.params.maxID,req.params.lineID, function (err, result) {
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
router.get("/:userID/:TypeID/:reportMsg/:maxID/:lineID",function (req, res) {
    report.getReportMsgNum(req.params.userID,req.params.TypeID,req.params.maxID,req.params.lineID,function (err, result) {
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

module.exports = router;
