var logger = require("log4js").getLogger("messageService");
var sql = require("../lib/sql");
var _ = require("underscore");

exports.getAllLine = function (callback) {
    var tsql = 'SELECT ID as id,LineName as lineName FROM sys_line WHERE IsActive = 1 ORDER BY lineName';
    sql.execute(tsql, function (err, result) {
        if (err) {
            return callback('服务器异常');
        }

        callback(null, result);
    });
};
