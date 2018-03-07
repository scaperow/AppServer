var log4js = require("log4js");
var logger = log4js.getLogger("userService");
var config = require("../config/app.js");
var encrypt = require("../lib/encrypt");
var sql = require("../lib/sql");
var Q = require("q");
var _ = require("underscore");
var date = require("date-utils");
var random = require('random-key');


var getLineStruct = function (line, userID, json, callback) {
    var testRooms = [];
    var nodeTrees = [];
    var nodeQuery = "";
    var deferred = Q.defer();

    var setTreeNodes = function () {
        var deferred = Q.defer();

        sql.queryConfig(nodeQuery, line.UserName, line.PassWord, line.DataSourceAddress, line.DataBaseName, function (err, result) {
                nodeTrees = result || [];
                organization();
                deferred.resolve(result);
            }
        );

        return deferred.promise;


    };

    var setTestRooms = function () {

        var unions = [];
        var tsql = " SELECT TestRoomCode FROM dbo.sys_user_testroom WHERE UserID = '" + json.userID + "'";
        sql.queryConfig(tsql, line.UserName, line.PassWord, line.DataSourceAddress, line.DataBaseName, function (err, result) {
            userTestRooms = result || [];
            deferred.resolve(result);
            _.each(result, function (item) {
                var t = item.TestRoomCode;
                if (t.length == 16) {
                    unions.push(" SELECT NodeCode ,[DESCRIPTION] ,DepType ,OrderID FROM dbo.Sys_Tree  WHERE (NodeCode = '#'  OR NodeCode LIKE '" + t.substr(0, 8) + "%') AND ((LEN(NodeCode) = 8 OR LEN(NodeCode) = 12 )  OR NodeCode = '" + t + "')");
                } else if (t.length < 16) {
                    unions.push(" SELECT NodeCode ,[DESCRIPTION] ,DepType ,OrderID FROM dbo.Sys_Tree  WHERE (NodeCode = '#'  OR NodeCode LIKE '" + t + "%') AND ((LEN(NodeCode) = 8 OR LEN(NodeCode) = 12 )  OR LEN(NodeCode) = 16)");
                }
            });
            if (userTestRooms.length == 0) {
                nodeQuery = "SELECT NodeCode ,[DESCRIPTION] ,DepType ,OrderID FROM dbo.Sys_Tree WHERE 1<>1"
            }
            else {
                nodeQuery = unions.join(" UNION ");
                nodeQuery = "SELECT distinct t.NodeCode,t.[DESCRIPTION],t.DepType ,t.OrderID FROM (" + nodeQuery + ") t ORDER BY t.OrderID";
            }
            if (json.lines.length > 1) {//看到多条线路，一定是业主或管理员，tags使用lineTag
                _.each(json.lines, function (lineItem) {
                    json.tags.push(lineItem.tag + "");
                });
                nodeQuery = "SELECT NodeCode ,[DESCRIPTION] ,DepType ,OrderID FROM dbo.Sys_Tree WHERE len(NodeCode)>4 ORDER BY OrderID"
                setTreeNodes();
            } else if (json.lines.length == 1) {//看到一条线路，可能是施工、监理单位人员
                var item4 = _.find(result, function (item) {
                    if (item.length == 4) {
                        return true;
                    }
                });

                if (item4) {//包含0001的权限，可看整条线路，tags使用lineTag
                    json.tags.push(line.LineTag + "");
                    nodeQuery = "SELECT NodeCode ,[DESCRIPTION] ,DepType ,OrderID FROM dbo.Sys_Tree WHERE len(NodeCode)>4 ORDER BY OrderID"
                    setTreeNodes();
                }
                else {//仅有某条线路部分的试验室可视权限
                    var cmd = " SELECT TestRoomCode FROM dbo.sys_user_testroom WHERE UserID = '" + json.userID + "' AND LEN(TestRoomCode) =8" +
                        " UNION" +
                        " SELECT TestRoomCode FROM dbo.sys_user_testroom WHERE UserID = '" + json.userID + "' AND LEN(TestRoomCode)=16 AND" +
                        " LEFT(TestRoomCode,8) NOT IN (SELECT TestRoomCode FROM dbo.sys_user_testroom WHERE UserID = '" + json.userID + "' AND LEN(TestRoomCode)=8)";

                    sql.queryConfig(cmd, line.UserName, line.PassWord, line.DataSourceAddress, line.DataBaseName, function (err2, result2) {
                        result2 = result2 || [];

                        _.each(result2, function (item2) {
                            json.tags.push(line.LineTag + "_" + item2.TestRoomCode);
                        });

                        setTreeNodes();
                    });
                }
            }
            else {
                setTreeNodes();
            }
        });

        return deferred.promise;
    };

    var result = [];
    var segment = null;
    var organization = function () {
        var testRoomList = [];
        _.each(nodeTrees, function (nodeTree) {
            var length = nodeTree.NodeCode.length;

            switch (length) {
                case 8:
                    if (segment) {
                        segment.testRooms = testRoomList;
                        result.push(segment);
                        segment = null;
                    }

                    if (!segment) {
                        segment = {};
                    }
                    testRoomList = [];
                    segment.name = nodeTree.DESCRIPTION;
                    break;
                case 12:
                    segment.name = segment.name + " " + nodeTree.DESCRIPTION;
                    segment.code = nodeTree.NodeCode;

                    break;
                case 16:
                    var tr = {};
                    tr.code = nodeTree.NodeCode;
                    tr.name = nodeTree.DESCRIPTION;
                    testRoomList.push(tr);
                    break;
            }

        });
        if (segment) {
            segment.testRooms = testRoomList;
            result.push(segment);
            segment = null;
        }

        callback(null, result);
    };

    setTestRooms();
};

exports.getUserByName = function (name, password, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    if (!name || !password) {
        return callback("name or password is null");
    }

    encrypt.rijndael(password, function (err, pwd) {
        if (err) {

            logger.error(err);
            return callback('服务器发生异常');
        }

        var cmd = "SELECT  TOP 1 ID,IsDeleted,AppActive,PhonePW,VCodeTime,Password from sys_user WHERE (Phone = '" + name + "' OR UserName = '" + name + "') ";
        sql.query(cmd, function (err, result) {
            if (err) {
                logger.error(err);
                return callback('服务器发生异常, 请稍后再试');
            }

            if (result && result.length > 0) {

                var user = result[0];
                if (1 === user.IsDeleted) {
                    return callback('您的账户当前不能使用, 请联系系统管理员');
                }

                if (1 !== user.AppActive) {
                    return callback('您的账号尚未激活手机端的功能, 请联系客服人员激活');
                }

                if (pwd !== user.Password && pwd !== user.PhonePW) {
                    return callback('用户名或密码不正确');
                }

                if (pwd === user.Password) {
                    return callback(null, user.ID);
                }

                if (pwd === user.PhonePW) {
                    var now = new Date();
                    now.addMinutes(-10);
                    var vcodeTime = new Date(user.VCodeTime);

                    if (Date.compare(now, vcodeTime) > 0) {
                        return callback('动态密码已超过有效期, 请重新获取');
                    } else {
                        return callback(null, user.ID);
                    }
                }

                return callback(null, '用户名或密码不正确');
            } else {
                return callback('当前用户不存在, 请联系管理员为您配置账号');
            }
        });
    });
}

exports.getUserByID = function (id, password, callback) {

    if (!callback) {
        return logger.error("callback is null");
    }

    if (!id || !password) {
        return callback("用户名或密码不能为空");
    }

    encrypt.rijndael(password, function (err, result) {
        if (err) {

            logger.error(err);
            return callback('服务器发生异常');
        }

        sql.query("SELECT  TOP 1 ID,IsDeleted,AppActive from sys_user WHERE ID = '" + id + "' AND  Password = '" + result + "'", function (err, result) {
            if (err) {

                logger.error(err);
                return callback('服务器发生异常');
            }

            if (result && result.length > 0) {
                var user = result[0];
                if (user.IsDeleted) {
                    return callback('您的账户当前不能使用, 请联系系统管理员');
                }

                if (!user.AppActive) {
                    return callback('您的账号尚未激活手机端的功能, 请联系客服人员激活');
                }

                return callback(null, id);
            } else {
                return callback('用户名或密码错误');
            }
        });
    });
}

exports.getUserInfo = function (userID, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    if (!userID) {
        return callback("用户信息不存在");
    }

    var lastLine = {};
    var json = {userID: userID, userName: '', roleName: '', lines: [], lastLine: {}, tags: []};

    var tsql = " SELECT b.ID,b.Description,b.LineTag,a.UserName FROM dbo.sys_user_lines a join sys_line b on a.LineID=b.ID WHERE a.UserID= '" + json.userID + "' ORDER BY b.Description";
    sql.query(tsql, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result && result.length > 0) {
            result = result || [];
            json.userName = result[0].UserName;

            _.each(result, function (item) {
                var line = {
                    ID: item.ID,
                    name: item.Description,
                    tag: item.LineTag
                };
                json.lines.push(line);
            });
            setLastLine();
        }
        else {
            return callback(null, null);
        }
    });

    var setLastLine = function () {
        var deferred = Q.defer();
        var tsql = "SELECT ID,LineName,IPAddress,Port,DataSourceAddress,UserName,PassWord,DataBaseName,LineTag,IsActive FROM dbo.sys_line WHERE ID = (SELECT LineID FROM dbo.sys_user WHERE ID =  '" + json.userID + "') AND IsActive > 0";

        sql.query(tsql, function (err, result) {
            result = result || [];
            lastLine = _.first(result);

            getLineStruct(lastLine, userID, json, function (err, result) {
                if (err) {
                    return callback(err);
                }

                json.lastLine.ID = lastLine.ID;
                json.lastLine.name = lastLine.LineName;
                json.lastLine.tag = lastLine.LineTag;
                json.lastLine.segments = result;
                callback(null, json);
            });
            deferred.resolve(result);
        });
        return deferred.promise;
    };
}

exports.getLineInfo = function (userID, userName, lineID, callback) {
    var json = {userID: userID, userName: userName, lines: [
        {ID: '1'},
        {ID: '2'}
    ], lastLine: {}, tags: []};
    var r = {};

    sql.query("UPDATE sys_user SET LineID = '" + lineID + "' WHERE ID = '" + userID + "'");

    sql.query("SELECT ID,LineName,IPAddress,Port,DataSourceAddress,UserName,PassWord,DataBaseName,IsActive FROM sys_line WHERE ID = '" + lineID + "' AND IsActive = 1 ", function (err, line) {
        if (err) {
            logger.error(err);
            return callback('服务器发生异常');
        }

        if (!line || line.length == 0) {
            logger.error("can not get line by ID'" + lineID + "'");
            return callback(null);
        }

        var lineInfo = _.first(line);
        var lineItem = {
            ID: lineInfo.ID,
            name: lineInfo.LineName
        };
        json.lines.push(lineItem);

        getLineStruct(lineInfo, userID, json, function (err, result) {
            if (err) {
                logger.error(err);
                return callback('服务器发生异常');
            }

            if (result) {
                r.name = lineInfo.LineName;
                r.ID = lineInfo.ID;
                r.segments = result;
            }
            callback(null, r);
        });
    });
}

exports.sendVCode = function (phone, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    if (!phone) {
        return callback("请输入电话号码");
    }

    sql.query("SELECT  TOP 1 PhonePW,VCodeTime from sys_user WHERE Phone = '" + phone + "' AND AppActive=1 AND IsDeleted=0", function (err, result) {
        if (err) {
            return callback("系统错误，请稍后再试");
        }

        if (result && result.length > 0) {
            var fst = _.first(result);
            var now = new Date();
            now.setTimeToNow();
            now.addMinutes(-10);

            if (now.isAfter(fst.VCodeTime)) {
                var code = random.generateDigits(6);
                encrypt.rijndael(code, function (err, encryptPwd) {
                    if (err) {
                        return callback('系统错误,请稍后再试');
                    }

                    sendSMS(phone, code, function (err, result) {
                        sql.execute("UPDATE sys_user SET VCodeTime = GETDATE(),PhonePW = '" + encryptPwd + "' WHERE Phone = '" + phone + "'");
                        callback(err, result);
                    });

                });
            } else {
                encrypt.decrypting(fst.PhonePW, function (err, pwd) {
                    if (err) {
                        return callback("系统错误，请稍后再试");
                    }

                    sendSMS(phone, pwd, function (err, result) {
                        sql.execute("UPDATE sys_user SET VCodeTime = (SELECT CONVERT(VARCHAR(100), GETDATE(), 20)) WHERE Phone = '" + phone + "'");
                        callback(err, result);
                    });
                });
            }
        }
        else {
            return callback("电话号码无效，请检查输入或联系管理员");
        }
    });

    var sendSMS = function (phone, pw, callback) {
        var soap = require('../node_modules/soap');
        var url = 'http://115.29.206.137:8081/myservice.svc?wsdl';
        var args = {Mobile: phone, Content: '您的动态密码为：' + pw + "，您可使用该密码登录手机端应用", Stime: "", Extno: "1"};
        soap.createClient(url, function (err, client) {
            if (!err) {
                client.SendSMS(args, function (err, result) {
                    if (err && err != 'null') {
                        logger.error('短信服务发生异常' + err);
                        return callback("系统错误, 请稍后再试");
                    }

                    else {
                        logger.info('SMS RESULT:' + result + " no:" + phone);
                        return callback(null, '动态密码将发送至该号码，请注意查收');
                    }
                });
            }
            else {
                return callback("系统错误，请稍后再试");
            }
        });
    };

}

exports.resetPassword = function (userID, oldPassword, newPassword, callback) {
    var valid = function (userID, password) {
        var deferred = Q.defer();
        var tsql = "SELECT Password FROM sys_user WHERE ID = '" + userID + "' AND Password = '" + password + "'";
        sql.query(tsql, function (err, result) {
            if (err) {
                return deferred.reject('服务器异常');
            }

            if (result && result.length > 0) {
                return deferred.resolve(true);
            }

            return deferred.reject('原始密码不正确');
        });

        return deferred.promise;
    }

    var modify = function (userID, password) {
        var deferred = Q.defer();
        var tsql = "UPDATE sys_user SET Password = '" + password + "' WHERE ID = '" + userID + "'";
        sql.execute(tsql, function (err, result) {
            if (err) {
                return deferred.reject('服务器异常');
            }

            return deferred.resolve(true);
        });

        return deferred.promise;
    }

    encrypt.rijndealInPromise(oldPassword)
        .then(function (encryptPassword) {
            return valid(userID, encryptPassword);
        })
        .then(function () {
            return encrypt.rijndealInPromise(newPassword)
        })
        .then(function (encryptPassword) {
            return modify(userID, encryptPassword);
        })
        .then(function (result) {
            return callback(null, result);
        })
        .then(null, function (err) {
            return callback(err);
        });

}

