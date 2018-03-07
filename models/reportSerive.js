/**
 * Created by howard on 14-10-23.
 */
var logger = require("log4js").getLogger("reportSerive");
var sql = require("../lib/sql");
var _ = require("underscore");

exports.getCurrData = function (userid, typeid, maxid, lineID, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    var filter = "MsgType=" + typeid + " and id>" + maxid + " and LineID='" + lineID + "'";
    var json = [];
    sql.queryMsg(20, filter, function (err, result) {
        if (err) {
            return callback(err, null);
        }
        else {
            if (!result || result.length == 0) {
                callback(err, null);
            }
            else {
                callback(null, result);
            }
        }
    });
}

exports.getReportMsgNum = function (userid, msgType, maxID, lineID, callback) {
    var sqlStr = "SELECT COUNT(0) as rest FROM app_message WHERE MsgType=" + msgType + " and lineID='" + lineID + "' and ID>" + maxID + ";";

    sql.query(sqlStr, function (err, result) {
        if (err) {
            return callback(err, null);
        }
        else {
            if (!result || result.length == 0) {
                callback(err, null);
            }
            else {
                callback(null, result);
            }
        }
    });
}