var log4js = require("log4js");
var logger = log4js.getLogger("testRoomService");
var config = require("../config/app.js");
var encrypt = require("../lib/encrypt");
var sql = require("../lib/sql");
var Q = require("q");
var _ = require("underscore");
var date = require("date-utils");
var random = require('random-key');
var baseInfo = require('../lib/baseInfo.js');

exports.getMembers = function (lineID, callback) {
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

    var getMember = function (line) {
        var deferred = Q.defer();
        if (!line) {
            return deferred.reject('当前线路不正确');
        }

        var config = sql.parseConfig(line);
        var cmd =
            "SELECT u.ID,c.标段名称,c.工程名称,c.试验室名称,u.TrueName,u.Phone,u.RoleName FROM " + sql.fixExtensionWithConfig(config, "sys_user") + " u JOIN v_bs_codeName c " +
                "  ON SUBSTRING(u.Code, 0,17) = c.试验室编码 AND u.LineID = '" + line.ID + "' WHERE u.IsDeleted = 0  AND u.RoleName IN ('SGGQ','JL','SGZX','BHZZZ') ORDER BY c.标段名称, c.试验室名称, u.TrueName";

        sql.queryWithConfig(cmd, config, function (err, result) {
            if (err) {
                logger.error(err);
                return deferred.reject('服务器异常');
            }

            deferred.resolve(result);
        });

        return deferred.promise;
    }

    var structMembers = function (members) {
        var result = {segments: []};
        var deferred = Q.defer();
        _.each(members, function (member) {
            var segment = {};
            if (_.where(result.segments, {name: member.标段名称}) <= 0) {
                segment = {
                    name: member.标段名称,
                    companyName: member.工程名称,
                    total: _.where(members, {标段名称: member.标段名称}).length,
                    testRooms: []
                };
                result.segments.push(segment);
            }

            segment = _.where(result.segments, {name: member.标段名称})[0];
            var testRoom = {};
            if (_.where(segment.testRooms, {name: member.试验室名称}) <= 0) {
                testRoom = {
                    name: member.试验室名称,
                    total: _.where(members, {标段名称: member.标段名称, 试验室名称: member.试验室名称}).length,
                    everyone: []
                };
                segment.testRooms.push(testRoom);
            }

            testRoom = _.where(segment.testRooms, {name: member.试验室名称})[0];

            testRoom.everyone.push({
                name: member.TrueName,
                phone: member.Phone,
                role: member.RoleName,
                id: member.ID
            });
        });

        deferred.resolve(result);
        return deferred.promise;
    }

    getLine(lineID)
        .then(getMember)
        .then(structMembers)
        .then(function (result) {
            callback(null, result);
        })
        .then(null, function (err) {
            callback(err);
        });
}

exports.getTestRooms = function (lineID, callback) {
    baseInfo.getTestRooms(lineID, callback);
}

exports.getDoList = function (userID, lineID, callback) {
    var config = null,
        testRoomCodes = null,
        invalidResult = null,
        testResult = null,
        requestResult = null,
        overTimeResult = null;

    var queryInvalid = function (userID, lineConfig, testRoomCodes) {
        var deferred = Q.defer(),
            tsql = "\
                    SELECT c.标段名称 as segmentName,c.单位名称 as companyName,c.试验室名称 as testRoomName, s.Total AS total FROM v_bs_codeName c JOIN\
                    (\
                        SELECT c.试验室编码, COUNT(1) AS Total\
                        FROM dbo.sys_invalid_document a\
                        JOIN dbo.v_bs_codeName c ON a.TestRoomCode = c.试验室编码\
                        JOIN dbo.sys_module d ON a.ModuleID = d.ID\
                        WHERE a.AdditionalQualified=0 AND (a.SGComment='' OR a.SGComment IS NULL\
                        OR a.DealResult='' OR a.DealResult IS NULL OR a.JLComment='' OR a.JLComment IS NULL) and a.Status>0\
                        GROUP BY  c.试验室编码\
                    )s ON s.试验室编码 = c.试验室编码  ORDER BY segmentName, companyName, testRoomName";


        var query = function (userRole, lineConfig, testRoomCodes) {
            if (userRole.toString().indexOf('SG') >= 0) {
                tsq = "\
                    SELECT c.标段名称 as segmentName,c.单位名称 as companyName,c.试验室名称 as testRoomName, s.Total AS total FROM v_bs_codeName c JOIN\
                    (\
                        SELECT c.试验室编码, COUNT(1) AS Total\
                        FROM dbo.sys_invalid_document a\
                        JOIN dbo.v_bs_codeName c ON a.TestRoomCode = c.试验室编码\
                        JOIN dbo.sys_module d ON a.ModuleID = d.ID\
                        WHERE a.AdditionalQualified=0 AND (a.SGComment='' OR a.SGComment IS NULL\
                        OR a.DealResult='' OR a.DealResult IS NULL) and a.Status>0\
                        GROUP BY  c.试验室编码\
                    )s ON s.试验室编码 = c.试验室编码  ORDER BY segmentName, companyName, testRoomName";
            }

            if (testRoomCodes && testRoomCodes.length > 0) {
                tsql += " testRoomCode IN (" + testRoomCodes.join("','") + ")";
            }

            sql.queryWithConfig(tsql, lineConfig, function (err, result) {
                if (err) {
                    return deferred.reject('服务器异常');
                }

                deferred.resolve(result);
            });

            return deferred.promise;
        }

        baseInfo.getUserRole(userID)
            .then(function (roleName) {
                return query(roleName, lineConfig, testRoomCodes);
            })
            .then(null, function (err) {
                deferred.reject(err);
            })
            .then(function (result) {
                deferred.resolve(result);
            });

        return deferred.promise;
    }

    var queryTest = function (lineConfig, testRoomCodes) {
        var deferred = Q.defer(),
            tsql = '\
                    SELECT c.标段名称 as segmentName,c.单位名称 as companyName,c.试验室名称 as testRoomName,c.试验室编码 as testRoomCode, s.Total AS total FROM v_bs_codeName c JOIN\
                    (\
                        SELECT f.试验室编码 ,COUNT(1) Total FROM dbo.sys_stadium a\
                        JOIN dbo.sys_module c ON a.ModuleID = c.ID\
                        JOIN dbo.sys_stadium_config d ON c.ID = d.ID AND\
                        a.StartTime<=GETDATE() AND a.EndTime>=GETDATE()\
                        JOIN dbo.v_bs_codeName f ON a.TestRoomCode=f.试验室编码\
                        WHERE c.ModuleType=1 AND a.F_IsDone=0\
                        GROUP by  f.试验室编码\
                    ) s ON s.试验室编码 = c.试验室编码 ORDER BY segmentName, companyName, testRoomName';

        var query = function (lineConfig, testRoomCodes) {
            if (testRoomCodes && testRoomCodes.length > 0) {
                tsql += " testRoomCode IN (" + testRoomCodes.join("','") + ")";
            }

            sql.queryWithConfig(tsql, lineConfig, function (err, result) {
                if (err) {
                    return deferred.reject('服务器异常');
                }

                deferred.resolve(result);
            });
        }

        query(lineConfig, testRoomCodes);

        return deferred.promise;
    }

    var queryRequest = function (lineConfig, testRoomCodes) {
        var deferred = Q.defer(),
            tsql = "\
                  SELECT c.标段名称 as segmentName,c.单位名称 as companyName,c.试验室名称 as testRoomName, s.Total AS total FROM v_bs_codeName c JOIN\
                  (\
                    SELECT c.试验室编码, count(1) AS Total FROM dbo.sys_request_change a\
                    JOIN dbo.v_bs_codeName c ON a.TestRoomCode = c.试验室编码 AND a.State='已提交' AND a.IsDelete=0\
                    JOIN dbo.sys_module d ON d.ID = a.ModuleID\
                    group by c.试验室编码\
                  )s ON s.试验室编码 = c.试验室编码 order by c.标段名称, c.单位名称, c.试验室名称";

        var query = function (lineConfig, testRoomCodes) {
            if (testRoomCodes && testRoomCodes.length > 0) {
                tsql += " testRoomCode IN (" + testRoomCodes.join("','") + ")";
            }

            sql.queryWithConfig(tsql, lineConfig, function (err, result) {
                if (err) {
                    return deferred.reject('服务器异常');
                }

                deferred.resolve(result);
            });
        }

        query(lineConfig, testRoomCodes);

        return deferred.promise;
    }

    var queryOvertTme = function (userID, lineConfig, testRoomCodes) {
        var deferred = Q.defer(),
            roleName = null,
            testRoomCodes = null,
            tsql = "SELECT c.标段名称 as segmentName,c.单位名称 as companyName,c.试验室名称 as testRoomName, s.Total AS total FROM v_bs_codeName c JOIN\
                (\
                    SELECT c.试验室编码,COUNT(1) AS Total\
                    FROM dbo.sys_test_overtime a\
                    JOIN dbo.v_bs_codeName c ON a.TestRoomCode=c.试验室编码\
                    JOIN dbo.sys_module d ON a.ModuleID=d.ID\
                    LEFT JOIN dbo.sys_stadium s ON s.DataID = a.DataID\
                    WHERE a.Status=0\
                    GROUP BY c.试验室编码\
                )s ON s.试验室编码 = c.试验室编码 order by c.标段名称, c.单位名称, c.试验室名称";

        var query = function (roleName, lineConfig, testRoomCodes) {
            var deferred = Q.defer();
            if (testRoomCodes && testRoomCodes.length > 0) {
                tsql += " testRoomCode IN (" + testRoomCodes.join("','") + ")";
            }

            sql.queryWithConfig(tsql, lineConfig, function (err, result) {
                if (err) {
                    return deferred.reject('服务器异常');
                }

                deferred.resolve(result);
            });

            return deferred.promise;
        };

        var supervisor = function (lineConfig, userID, roleName) {
            var deferred = Q.defer();
            if (roleName.toString().indexOf('JL') >= 0) {
                baseInfo.getUserInTestRomCode(lineConfig, userID)
                    .then(null, function (err) {
                        console.log(err);
                        deferred.resolve();
                    })
                    .then(function (inTestRoomCode) {
                        tsql += " AND ((a.SGComment IS NOT NULL AND a.SGComment<>'') OR (a.TestRoomCode='" + inTestRoomCode + "'))";
                        deferred.resolve();
                    });
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        }

        baseInfo.getUserRole(userID)
            .then(function (role) {
                roleName = role;
                return supervisor(lineConfig, userID, roleName);
            })
            .then(function () {
                return baseInfo.getUserInTestRomCode(lineConfig, userID);
            })
            .then(function (codes) {
                return query(roleName, lineConfig, testRoomCodes);
            })
            .then(null, function (err) {
                deferred.reject(err);
            })
            .then(function (result) {
                deferred.resolve(result);
            });

        return deferred.promise;
    }

    baseInfo.getConfig(lineID)
        .then(function (lineConfig) {
            config = lineConfig;
            return baseInfo.getAccessTestRoomCode(userID);
        })
        .then(function (codes) {
            testRoomCodes = codes;
            return queryTest(config, testRoomCodes);
        })
        .then(function (result) {
            testResult = baseInfo.formatSegments(result);
            return queryInvalid(userID, config, testRoomCodes);
        })
        .then(function (result) {
            invalidResult = baseInfo.formatSegments(result);
            return queryRequest(config, testRoomCodes);
        })
        .then(function (result) {
            requestResult = baseInfo.formatSegments(result);
            return queryOvertTme(userID, config, testRoomCodes);
        })
        .then(null, function (err) {
            callback(err);
        })
        .then(function (result) {
            overTimeResult = baseInfo.formatSegments(result);
            callback(null, {
                overTimeResult: overTimeResult,
                requestResult: requestResult,
                testResult: testResult,
                invalidResult: invalidResult
            });
        });
}

exports.getInformation = function (lineID, testRoomCode, callback) {
    var getCellValue = function (cells, name) {
        var result = '';

        _.each(cells, function (cell) {
            if (cell.Name === name) {
                return result = cell.Value;
            }
        });

        return result;
    }

    var query = function (config, testRoomCode) {
        var deferred = Q.defer();
        var tsql = "select data from sys_document where moduleid ='E77624E9-5654-4185-9A29-8229AAFDD68B' AND testroomcode='" + testRoomCode + "'";
        sql.queryWithConfig(tsql, config, function (err, result) {
            var o = {};
            if (err) {
                return deferred.reject('服务器异常');
            }

            if (result && result.length > 0) {
                var document = eval("(" + result[0].data + ")");
                o.companyName = getCellValue(document.Sheets[0].Cells, 'D4');
                o.testRoomName = getCellValue(document.Sheets[0].Cells, 'D5');
                o.masterName = getCellValue(document.Sheets[0].Cells, 'D6');
                o.address = getCellValue(document.Sheets[0].Cells, 'D7');
                o.ename = getCellValue(document.Sheets[0].Cells, 'K4');
                o.etel = getCellValue(document.Sheets[0].Cells, 'O4');
                o.mname = getCellValue(document.Sheets[0].Cells, 'K5');
                o.mtel = getCellValue(document.Sheets[0].Cells, 'O5');
                o.bname = getCellValue(document.Sheets[0].Cells, 'K6');
                o.btel = getCellValue(document.Sheets[0].Cells, 'O6');
                o.code = getCellValue(document.Sheets[0].Cells, 'K7');
                o.fax = getCellValue(document.Sheets[0].Cells, 'O7');
                o.tsize = getCellValue(document.Sheets[0].Cells, 'G20');
                o.ssize = getCellValue(document.Sheets[0].Cells, 'L20');
                o.items = getCellValue(document.Sheets[0].Cells, 'A22');
                deferred.resolve(o);
            }

            return deferred.resolve(o);
        });

        return deferred.promise;
    }

    baseInfo.getConfig(lineID)
        .then(function (config) {
            return query(config, testRoomCode);
        })
        .then(null, function (err) {
            return callback(err);
        })
        .then(function (result) {
            callback(null, result);
        });
}

exports.getUserList = function (lineID, callback) {
    var query = function (config) {
        var deferred = Q.defer();
        var tsql = "SELECT u.ID,c.标段名称,c.工程名称,c.试验室名称,u.TrueName,u.Phone,u.RoleName FROM " + sql.fixExtensionWithConfig(config, "sys_user") + " u JOIN v_bs_codeName c " +
            " ON SUBSTRING(u.Code, 0,17) = c.试验室编码 AND u.LineID = '" + lineID + "' WHERE u.IsDeleted = 0  ORDER BY c.标段名称, c.试验室名称, u.TrueName";

        sql.queryWithConfig(tsql, config, function (err, result) {
            if (err) {
                deferred.reject('服務器異常');
            }

            deferred.resolve(result);
        });

        return deferred.promise;
    }

    baseInfo.getConfig(lineID)
        .then(function (config) {
            return query(config);
        })
        .then(null,function (err) {
            return callback(err);
        }).then(function (result) {
            callback(null, result);
        });


}

exports.modifyUser = function (user, callback) {
    var tsql = "UPDATE sys_user SET Phone = '" + user.phone + "', RoleName = '" + user.roleName + "' WHERE ID = '" + user.id + "'";
    sql.execute(tsql, function (err) {
        if (err) {
            return callback('服務器異常');
        }

        return callback(null);
    })
}