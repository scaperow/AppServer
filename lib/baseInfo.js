var log4js = require("log4js");
var logger = log4js.getLogger("baseInfo");
var sql = require("./sql");
var Q = require("q");
var _ = require("underscore");
var date = require("date-utils");
var random = require('random-key');

exports.getTestRooms = function (lineID, callback) {

    var queryTestRooms = function (lineConfig) {
        var deferred = Q.defer();
        var tsql = 'SELECT * FROM v_bs_codeName ORDER BY 标段名称, 单位名称, 试验室名称';
        sql.queryWithConfig(tsql, lineConfig, function (err, testRooms) {
            if (err) {
                logger.error(err);
                return deferred.reject('服务器异常');
            }

            deferred.resolve(testRooms);
        });
        return deferred.promise;
    }
    var structTestRooms = function (testRooms) {
        var deferred = Q.defer();
        var result = {segments: []};
        _.each(testRooms, function (testRoom) {
            var existenceOnSegment = _.where(result.segments, {name: testRoom.标段名称});
            var segment = null;
            if (existenceOnSegment.length <= 0) {
                segment = {
                    name: testRoom.标段名称,
                    code: testRoom.标段编码,
                    companies: []
                };
                result.segments.push(segment);
            } else {
                segment = existenceOnSegment[0];
            }

            var existenceOnCompany = _.where(segment.companies, {name: testRoom.单位名称});
            var company = null;
            if (existenceOnCompany.length <= 0) {
                company = {
                    name: testRoom.单位名称,
                    code: testRoom.单位编码,
                    testRooms: []
                };
                segment.companies.push(company);
            } else {
                company = existenceOnCompany[0];
            }

            var existenceOnTestRoom = _.where(company.testRooms, {name: testRoom.试验室名称});
            if (existenceOnTestRoom.length <= 0) {
                var testRoom = {
                    name: testRoom.试验室名称,
                    code: testRoom.试验室编码
                };

                company.testRooms.push(testRoom);
            }
        });

        deferred.resolve(result);
        return deferred.promise;
    }

    this.getConfig(lineID)
        .then(queryTestRooms)
        .then(structTestRooms)
        .then(function (result) {
            callback(null, result);
        })
        .then(null, function (err) {
            callback(err);
        });
}

exports.getLine = function (lineID) {
    var deferred = Q.defer();
    var tsql = "SELECT * FROM sys_line WHERE ID = '" + lineID + "'";
    sql.query(tsql, function (err, line) {
        if (err) {
            logger.error(err);
            return deferred.reject('服务器异常');
        }

        return deferred.resolve(line);
    });

    return deferred.promise;
}

exports.getConfig = function (lineID) {
    var tsql = "SELECT * FROM sys_line WHERE ID = '" + lineID + "'",
        deferred = Q.defer();

    sql.query(tsql, function (err, line) {
        if (err) {
            return deferred.reject('服务器异常');
        }

        if (line && line.length > 0) {
            line = line [0];
        }

        var config = sql.parseConfig(line);
        return deferred.resolve(config);
    });

    return deferred.promise;
}

exports.getLineAndConfig = function (lineID) {
    var tsql = "SELECT * FROM sys_line WHERE ID = '" + lineID + "'";
    var deferred = Q.defer();
    sql.query(tsql, function (err, line) {
        if (err) {
            return deferred.reject('服务器异常');
        }

        var result = {line: line, config: sql.buildConfig(line)};
        return deferred.resolve(result);
    });

    return deferred.promise;
}

exports.getUserRole = function (userID) {
    var deferred = Q.defer(),
        tsql = "SELECT RoleName AS roleName FROM sys_user WHERE ID = '" + userID + "'";

    sql.query(tsql, function (err, result) {
        if (err) {
            return deferred.reject('服务器异常');
        }

        if (!result || result.length <= 0) {
            logger.error('ID为' + userID + '的用户没有配置权限');
            return deferred.reject('当前用户没有配置权限');
        }

        deferred.resolve(result[0].roleName);

    });

    return deferred.promise;
}

exports.getAccessTestRoomCode = function (userID) {
    var deferred = Q.defer();

    var queryNodeCode = function (userID, testRoomCodes) {
        var tsql = '',
            unions = [],
            deferred = Q.defer();

        _.each(testRoomCodes, function (testRoomCode) {
            unions.push("SELECT NodeCode  FROM dbo.Sys_Tree  WHERE  NodeCode LIKE '" + testRoomCode + "%' AND LEN(NodeCode)=16");
        });

        tsql = unions.join(' UNION ');
        tsql = "SELECT distinct t.NodeCode AS testRooms AS nodeCode FROM (" + nodeQuery + ") t";

        sql.query(tsql, function (err, result) {
            if (err) {
                return deferred.reject('服务器异常');
            }

            deferred.resolve(result);
        });
    };

    var queryTestRoom = function (lineConfig, userID) {
        var deferred = Q.defer(),
            tsql = "SELECT TestRoomCode AS testRoomCode FROM dbo.sys_user_testroom WHERE UserID='" + userID + "'";

        sql.queryWithConfig(tsql, lineConfig, function (err, result) {
            if (err) {
                return deferred.reject('服务器异常');
            }

            deferred.resolve(result);

        });
    };

    this.getUserRole(userID)
        .then(function (userRole) {
            switch (userRole) {
                case 'ADMIN':
                case 'BHZYZ':
                case 'YZ':
                case 'GGZX':
                    return deferred.resolve([]);
                default:
                    return queryTestRoom(userID);
            }
        })
        .then(function (testRoomCodes) {
            return queryNodeCode(userID, testRoomCodes);
        })
        .then(null, function (err) {
            deferred.reject(err);
        })
        .then(function (result) {
            deferred.resolve(result);
        });

    return deferred.promise;

}

exports.getUserInTestRomCode = function (lineConfig, userID) {
    var tsql = "SELECT TestRoomCode AS testRoomCode FROM sys_user_testroom WHERE UserID = '" + userID + "'",
        deferred = Q.defer();

    sql.query(tsql, function (err, result) {
        if (err) {
            return deferred.reject('服务器异常');
        }

        if (result) {
            if (result.length === 0) {
                deferred.resolve(result[0]);
            } else {
                deferred.resolve(result);
            }
        } else {
            return deferred.reject('没有找到与该用户相关的实验室');
        }
    });

    return deferred.promise;
}

exports.formatSegments = function (rows) {
    var result = {segments: [], total: 0};

    _.each(rows, function (row) {
        var segment = {};
        var segmentExists = _.where(result.segments, {name: row.segmentName});
        if (segmentExists.length <= 0) {
            segment = {
                name: row.segmentName,
                companies: [],
                total: 0
            };

            result.segments.push(segment);
        } else {
            segment = segmentExists[0];
        }

        var company = {};
        var companiesExists = _.where(segment.companies, {name: row.companyName});
        if (companiesExists.length <= 0) {
            company = {
                name: row.companyName,
                total: 0,
                testRooms: []
            };
            segment.companies.push(company);
        } else {
            company = companiesExists[0];
        }


        var testRomsExists = _.where(company.testRooms, {name: row.testRoomName});
        var testRoom = {};
        if (testRomsExists.length <= 0) {
            testRoom = {
                name: row.testRoomName,
                total: 0
            };

            company.testRooms.push(testRoom);
        }

        segment.total += row.total;
        company.total += row.total;
        testRoom.total += row.total;
        result.total += row.total;
    });

    return result;
}
