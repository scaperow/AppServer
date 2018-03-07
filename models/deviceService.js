var log4js = require("log4js");
var logger = log4js.getLogger("deviceService");
var config = require("../config/app.js");
var sql = require("../lib/sql");
var Q = require("q");
var _ = require("underscore");
var date = require("date-utils");
var random = require('random-key');

exports.getDevices = function (lineID, callback) {
    if (!callback) {
        return logger.error('callback is null');
    }

    if (!lineID) {
        logger.error('Invalid of lineID "' + lineID + '"');
        return callback('当前的线路不正确');
    }

    var getLine = function (lineID) {
        var deferred = Q.defer();
        var cmd = "SELECT * FROM sys_line WHERE ID = '" + lineID + "'";
        sql.query(cmd, function (err, result) {
            if (err) {
                logger.error(err);
                return deferred.reject('服务器异常');
            }

            if (result && result.length > 0) {
                deferred.resolve(result[0]);
            } else {
                deferred.resolve(null);
            }
        });

        return deferred.promise;
    }

    queryDevices = function (line) {
        var deferred = Q.defer();
        if (!line) {
            return deferred.reject('当前线路不正确');
        }

        var config = sql.parseConfig(line);
        var cmd =
            "SELECT c.标段名称,c.单位名称,c.试验室名称,(CASE WHEN s.DeviceType = 1 THEN '压力机' ELSE '万能机' END) AS DeviceType,s.Total FROM v_bs_codeName c JOIN" +
                "(" +
                " SELECT TestRoomCode,DeviceType,COUNT(1) AS Total FROM dbo.sys_devices" +
                " WHERE IsActive = 0"+
                " GROUP BY DeviceType, TestRoomCode" +
                ") s ON s.TestRoomCode = c.试验室编码";

        sql.queryWithConfig(cmd, config, function (err, result) {
            if (err) {
                logger.error(err);
                return deferred.reject('服务器异常');
            }

            deferred.resolve(result);
        });

        return deferred.promise;
    }

    var structDevices = function (devices) {
        var result = {segments: []};
        var deferred = Q.defer();
        _.each(devices, function (device) {
            var segment = {};
            if (_.where(result.segments, {name: device.标段名称}) <= 0) {
                segment = {
                    name: device.标段名称,
                    companyName: device.单位名称,
                    testRooms: [],
                    total: 0
                };
                result.segments.push(segment);
            }

            segment = _.where(result.segments, {name: device.标段名称})[0];
            var testRoom = {};
            if (_.where(segment.testRooms, {name: device.试验室名称}) <= 0) {
                testRoom = {
                    name: device.试验室名称,
                    total: 0,
                    everyone: []
                };
                segment.testRooms.push(testRoom);
            }

            testRoom = _.where(segment.testRooms, {name: device.试验室名称})[0];
            testRoom.everyone.push({
                name: device.DeviceType,
                total: device.Total
            });

            segment.total += device.Total;
            testRoom.total += device.Total;
        });

        deferred.resolve(result);
        return deferred.promise;
    }

    getLine(lineID)
        .then(queryDevices)
        .then(structDevices)
        .then(function (result) {
            callback(null, result);
        })
        .then(null, function (err) {
            callback(err);
        });
}


