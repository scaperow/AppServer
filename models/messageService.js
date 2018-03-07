var logger = require("log4js").getLogger("messageService");
var sql = require("../lib/sql");
var _ = require("underscore");

exports.getAllMessage = function (lineID, userID, msgID, category, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }
    var json = {rest: 0, msgs: []};
    var cmd = "SELECT RoleName FROM dbo.sys_user WHERE ID='" + userID + "'";
    sql.query(cmd, function (err, result) {
        if (err) {
            return callback(null);
        }
        var cate = '';
        if (category == 1) {
            cate = ' (MsgType=1 or MsgType=2)';
        }
        else if (category == 2) {
            cate = ' (MsgType=3)';
        }
        else if (category == 3) {
            cate = ' (MsgType=4)';
        }
        else if (category == 4) {
            cate = ' (MsgType=5)';
        }
        else {
            cate = '1=1';
        }
        if (!result || result.length == 0) {
            logger.error("can not get role name by user id '" + userID + "'");
            return callback(null);
        }

        var roleInfo = _.first(result);
        if (roleInfo.RoleName == 'ADMIN' || roleInfo.RoleName == 'BHZYZ' || roleInfo.RoleName == 'YZ' || roleInfo.RoleName == 'GGZX') {
            var filter = " LineID='" + lineID + "' AND ID > " + msgID + " AND " + cate;
            sql.queryMsg(20, filter, function (err, result) {
                if (err) {
                    logger.error(err);
                    return callback('服务器发生异常');
                }

                json.rest = result.rest;
                _.each(result.msg, function (item) {
                    var m = {
                        ID: item.ID,
                        Msg: item.Msg,
                        MsgFull: item.MsgFull,
                        MsgType: item.MsgType,
                        SendTime: item.SendTime,
                        LineID: item.LineID,
                        TestRoomCode: item.TestRoomCode,
                        LineName: item.LineName,
                        SegmentName: item.SegmentName,
                        CompanyName: item.CompanyName,
                        TestRoomName: item.TestRoomName
                    };
                    json.msgs.push(m);
                });

                callback(null, json);
            });
        }
        else {
            var s3 = "SELECT DataSourceAddress,UserName,PassWord,DataBaseName,ID FROM dbo.sys_line where ID='" + lineID + "'";
            console.log(s3);
            sql.query(s3, function (err, line) {
                if (err) {
                    logger.error(err);
                    return callback('服务器发生异常');
                }

                if (!line || line.length == 0) {
                    logger.error("can not get line by ID'" + lineID + "'");
                    return callback(null);
                }

                var lineInfo = _.first(line);
                var unions = [];
                var nodeQuery = "SELECT TestRoomCode FROM dbo.sys_user_testroom WHERE UserID='" + userID + "'";

                sql.queryConfig(nodeQuery, lineInfo.UserName, lineInfo.PassWord, lineInfo.DataSourceAddress, lineInfo.DataBaseName, function (err, result) {
                    _.each(result, function (item) {
                        unions.push(" SELECT NodeCode  FROM dbo.Sys_Tree  WHERE  NodeCode LIKE '" + item.TestRoomCode + "%' AND LEN(NodeCode)=16 ");
                    });
                    nodeQuery = unions.join(" UNION ");
                    nodeQuery = "SELECT distinct NodeCode FROM (" + nodeQuery + ") t";
                    sql.queryConfig(nodeQuery, lineInfo.UserName, lineInfo.PassWord, lineInfo.DataSourceAddress, lineInfo.DataBaseName, function (err, result) {
                        userTestRooms = result || [];
                        var testRoomCodes = [];
                        _.each(userTestRooms, function (a) {
                            testRoomCodes.push(a.NodeCode);
                        });

                        if (testRoomCodes.length > 0) {
                            var s4 = "SELECT COUNT(1) AS rest FROM dbo.app_message WHERE LineID='" + lineInfo.ID +
                                "' AND ID>" + msgID + " AND TestRoomCode IN ('" + testRoomCodes.join("','") + "') AND " + cate;
                            var filter = "LineID='" + lineInfo.ID + "' AND ID>" + msgID + " AND TestRoomCode IN ('" + testRoomCodes.join("','") + "') AND " + cate;
                            sql.queryMsg(20, filter, function (err, result) {
                                if (err) {
                                    logger.error(err);
                                    return callback('服务器发生异常');
                                }

                                json.rest = result.rest;
                                _.each(result.msg, function (item) {
                                    var m = {
                                        ID: item.ID,
                                        Msg: item.Msg,
                                        MsgFull: item.MsgFull,
                                        MsgType: item.MsgType,
                                        SendTime: item.SendTime,
                                        LineID: item.LineID,
                                        TestRoomCode: item.TestRoomCode,
                                        LineName: item.LineName,
                                        SegmentName: item.SegmentName,
                                        CompanyName: item.CompanyName,
                                        TestRoomName: item.TestRoomName
                                    };
                                    json.msgs.push(m);
                                });
                                callback(null, json);
                            });
                        }
                        else {
                            callback(null, json);
                        }
                    });
                });
            });
        }

    });
};

exports.getRestOfMessage = function (lineID, userID, msgID, category, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    var json = {rest: 0};
    var cmd = "SELECT RoleName FROM dbo.sys_user WHERE ID='" + userID + "'";
    sql.query(cmd, function (err, result) {
        if (err) {
            return callback(null);
        }
        var cate = '';
        if (category == 1) {
            cate = ' (MsgType=1 or MsgType=2)';
        }
        else if (category == 2) {
            cate = ' (MsgType=3)';
        }
        else if (category == 3) {
            cate = ' (MsgType=4)';
        }
        else if (category == 4) {
            cate = ' (MsgType=5)';
        }
        else {
            cate = '1=1';
        }

        if (!result || result.length == 0) {
            logger.error("can not get role name by user id '" + userID + "'");
            return callback('您的账户无权访问此数据');
        }

        var roleInfo = _.first(result);
        if (roleInfo.RoleName == 'ADMIN' || roleInfo.RoleName == 'BHZYZ' || roleInfo.RoleName == 'YZ' || roleInfo.RoleName == 'GGZX') {
            var filter = " LineID='" + lineID + "' AND ID > " + msgID + " AND " + cate;
            sql.queryRestOfMessage( filter, function (err, result) {
                if (err) {
                    logger.error(err);
                    return callback('服务器发生异常');
                }

                callback(null, result);
            });
        }
        else {
            var s3 = "SELECT DataSourceAddress,UserName,PassWord,DataBaseName,ID FROM dbo.sys_line where ID='" + lineID + "'";
            sql.query(s3, function (err, line) {
                if (err) {
                    logger.error(err);
                    return callback('服务器发生异常');
                }

                if (!line || line.length == 0) {
                    logger.error("can not get line by ID'" + lineID + "'");
                    return callback(null);
                }

                var lineInfo = _.first(line);
                var unions = [];
                var nodeQuery = "SELECT TestRoomCode FROM dbo.sys_user_testroom WHERE UserID='" + userID + "'";

                sql.queryConfig(nodeQuery, lineInfo.UserName, lineInfo.PassWord, lineInfo.DataSourceAddress, lineInfo.DataBaseName, function (err, result) {
                    _.each(result, function (item) {
                        unions.push(" SELECT NodeCode  FROM dbo.Sys_Tree  WHERE  NodeCode LIKE '" + item.TestRoomCode + "%' AND LEN(NodeCode)=16 ");
                    });
                    nodeQuery = unions.join(" UNION ");
                    nodeQuery = "SELECT distinct NodeCode FROM (" + nodeQuery + ") t";

                    sql.queryConfig(nodeQuery, lineInfo.UserName, lineInfo.PassWord, lineInfo.DataSourceAddress, lineInfo.DataBaseName, function (err, result) {
                        userTestRooms = result || [];
                        var testRoomCodes = [];
                        _.each(userTestRooms, function (a) {
                            testRoomCodes.push(a.NodeCode);
                        });

                        if (testRoomCodes.length > 0) {
                            var s4 = "SELECT COUNT(1) AS rest FROM dbo.app_message WHERE LineID='" + lineInfo.ID +
                                "' AND ID>" + msgID + " AND TestRoomCode IN ('" + testRoomCodes.join("','") + "') AND " + cate;
                            var filter = "LineID='" + lineInfo.ID + "' AND ID>" + msgID + " AND TestRoomCode IN ('" + testRoomCodes.join("','") + "') AND " + cate;
                            sql.queryRestOfMessage( filter, function (err, result) {
                                if (err) {
                                    logger.error(err);
                                    return callback('服务器发生异常');
                                }

                                callback(null, result);
                            });
                        }
                        else {
                            callback(null, {rest: 0});
                        }
                    });
                });
            });
        }
    });
}
