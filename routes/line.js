var express = require('express');
var router = express.Router();
var lineService = require('../models/lineService');
var logger = require("log4js").getLogger("device");


router.get('/lines', function (req, res) {
    lineService.getAllLine(function (err, result) {
        if (err) {
            return res.send({error: err});
        }

        res.send(result);
    });
});


module.exports = router;


