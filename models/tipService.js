var logger = require("log4js").getLogger("messageService");
var sql = require("../lib/sql");
var _ = require("underscore");
var base = require("../lib/baseInfo");

exports.getTips = function (maxID, lineID, callback) {
    sql.queryMsgInPromise(10, "MsgType = 10 AND LineID = '" + lineID + "' AND ID > " + maxID)
        .then(null,function (err) {
            logger.error(err);
            callback(err);
        }).then(function (result) {
            callback(null, result)
        });
}

exports.getRestOfTips = function (maxID, lineID, callback) {
    sql.queryRestInPromise("ID > " + maxID + " AND LineID ='" + lineID + "' AND MsgType = 10")
        .then(null, function (err) {
            callback(err);
        })
        .then(function (result) {
            callback(null, result);
        });
}