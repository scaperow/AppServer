var log4js = require("log4js");
var logger = log4js.getLogger("deviceService");
var config = require("../config/app.js");
var sql = require("../lib/sql");
var Q = require("q");
var _ = require("underscore");
var date = require("date-utils");
var random = require('random-key');


exports.getLineInfo = function () {

}

exports.getDatabaseConfigOfLine = function (lineID) {
    var deferred = Q.defer()
        , tsql = "SELECT * FROM sys_line WHERE ID = '" + lineID + "'";

    sql.query(tsql, function (err, result) {
        var config = {};

        if (err) {
            return deferred.reject('服务器异常');
        }

        if (result && result.length > 0) {
            config = sql.parseConfig(result[0]);
        }

        deferred.resolve(config);

    });

    return deferred.promise;
}

