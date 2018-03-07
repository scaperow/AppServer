var express = require('express');
var router = express.Router();
var tip = require('../models/tipService');
var logger = require('log4js').getLogger('tinyTip');

router.get('/:maxID/:lineID', function (req, res) {
    tip.getTips(req.params.maxID, req.params.lineID, function (err, result) {
        if (err) {
            return    res.send({error: err});
        }

        return res.send(result);
    })
});

router.get('/rest/:maxID/:lineID', function (req, res) {
    tip.getRestOfTips(req.params.maxID, req.params.lineID, function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        return res.send(result);
    });
});

module.exports = router;