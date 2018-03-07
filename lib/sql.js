var mssql = require("mssql");
var logger = require("log4js").getLogger("sql");
var _ = require("underscore");
var sql = require("./sql");
var Q = require('Q');

var config = {
    user: "sygldb_kingrocket_f",
    password: "wdxlzyn@#830",
    server: "112.124.99.146", // You can use 'localhost\\instance' to connect to named instance
    database: "SYGLDB_LIB",
    options: {
        useUTC: false
    }};

exports.libConfig = config;

exports.buildConfig = function (user, password, server, database) {
    return {
        user: user,
        password: password,
        server: server,
        database: database,
        options: {
            useUTC: false
        }
    };
};

exports.fixExtensionWithConfig = function (configWithoutLib, tableNameWithLibrary) {
    if (configWithoutLib.server != config.server) {
        return 'LIB_Link.SYGLDB_LIB.dbo.' + tableNameWithLibrary;
    } else {
        return 'SYGLDB_LIB.dbo.' + tableNameWithLibrary;
    }
};

exports.parseConfig = function (dataRow) {
    var result = {};

    if (dataRow) {
        result.user = dataRow.UserName;
        result.password = dataRow.PassWord;
        result.server = dataRow.DataSourceAddress;
        result.database = dataRow.DataBaseName;
        result.options = {
            encrypt: true,
            useUTC: false
        };
    }

    return result;
};

exports.query = function (cmd, callback) {
    if (!cmd) {
        return callback("cmd is null");
    }

    var connection = new mssql.Connection(config, function (err) {
        if (err) {
            logger.error(err);
            callback(err);
        }

        var request = connection.request();
        request.query(cmd, function (err, result) {
            if (err) {
                logger.error(cmd);
            }

            if (callback) {
                callback(err, result);
            }
        });
    });
};

exports.execute = function (cmd, callback) {

    if (!cmd) {
        return logger.error("cmd is null");
    }

    var connection = new mssql.Connection(config, function (err) {
        if (err) {
            logger.error(err);
            logger.error(cmd);

            if (callback) {
                callback(err);
            }

            return;
        }

        var request = connection.request();
        request.query(cmd, function (err, result) {
            if (err) {
                logger.error(cmd);
            }

            if (callback) {
                callback(err, result);
            }
        });
    });
};

exports.queryConfig = function (cmd, user, password, server, database, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    if (!cmd) {
        return callback("cmd is null");
    }

    var connection = new mssql.Connection({
        user: user,
        password: password,
        server: server,
        database: database
    }, function (err) {
        if (err) {
            logger.error(err);
            logger.error(cmd);
            return callback(err);
        }

        var request = connection.request();
        request.query(cmd, function (err, result) {
            if (err) {
                logger.error(cmd);
            }

            callback(err, result);
        });
    });
};

exports.queryWithConfig = function (cmd, config, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    if (!cmd) {
        return callback("cmd is null");
    }

    var connection = new mssql.Connection({
        user: config.user,
        password: config.password,
        server: config.server,
        database: config.database
    }, function (err) {
        if (err) {
            logger.error(cmd);
            logger.error(err);
            return callback(err);
        }

        var request = connection.request();
        request.query(cmd, function (err, result) {
            if (err) {
                logger.error(cmd);
            }

            callback(err, result);
        });
    });
};

exports.queriesWithConfig = function (cmd, config, callback) {
    if (!callback) {
        return logger.error("callback is null");
    }

    if (!cmd) {
        return callback("cmd is null");
    }

    var connection = new mssql.Connection({
        user: config.user,
        password: config.password,
        server: config.server,
        database: config.database
    }, function (err) {
        if (err) {
            logger.error(err);
            logger.error(cmd);
            return callback(err);
        }

        var request = connection.request();
        request.multiple = true;
        request.query(cmd, function (err, result) {
            if (err) {
                logger.error(cmd);
            }

            callback(err, result);
        });
    });
}

/**
 * 根据条件查询消息及剩余数量
 * @param count 要获取的数量
 * @param filter 用于过滤的查询条件
 * @param config 如果要查询其他数据库，该参数为此数据库的链接配置
 * @param callback 查询完成后的回掉函数,callback(err, result){
 *      result.rest 剩余消息数量
 *      result.msg 消息内容
 * }
 */
exports.queryMsg = function (count, filter, callback) {

    if (!callback) {
        return logger.error('callback is null');
    }

    if (!count || count < 0) {
        return callback('count less 0');
    }

    var onQueryRest = function (err, rest, msg) {
        var result = {};

        if (err) {
            return callback(err);
        }

        if (rest && rest.length > 0) {
            var fst = _.first(rest).rest;
            result.rest = fst > count ? fst - count : 0;
        }

        if (msg) {
            result.msg = msg;
        }

        callback(null, result);
    };

    var onQueryRows = function (err, msg) {
        if (err) {
            return callback(err);
        }

        var cmd = 'SELECT COUNT(1) AS rest FROM app_message WHERE ' + filter;
        if (config) {
            sql.query(cmd, function (err, rest) {
                onQueryRest(err, rest, msg)
            });
        } else {
            sql.query(cmd, function (err, rest) {
                onQueryRest(err, rest, msg);
            });
        }
    };

    var cmd = 'SELECT TOP ' + count + ' ID,MsgFull,Msg,MsgType,SendTime,LineID,TestRoomCode,LineName,SegmentName,CompanyName,TestRoomName FROM app_message WHERE ' + filter + ' ORDER BY SendTime ASC';

    sql.query(cmd, onQueryRows);
};

exports.queryMsgInPromise = function (count, filter) {
    var deferred = Q.defer();

    this.queryMsg(count, filter, function (err, result) {
        if (err) {
            return deferred.reject(err);
        }

        deferred.resolve(result);
    });

    return deferred.promise;
};


/**
 * 根据条件查询剩余数量
 * @param count 要获取的数量
 * @param filter 用于过滤的查询条件
 * @param config 如果要查询其他数据库，该参数为此数据库的链接配置
 * @param callback 查询完成后的回掉函数,callback(err, result){
 *      result.rest 剩余消息数量
 *      result.msg 消息内容
 * }
 */
exports.queryRestOfMessage = function (filter, callback) {
    var onQueryRest = function (err, rest) {
        var result = {rest: 0};

        if (err) {
            return callback(err);
        }

        if (rest && rest.length > 0) {
            result.rest = _.first(rest).rest;
        }

        callback(null, result);
    };


    var cmd = 'SELECT COUNT(1) AS rest FROM app_message WHERE ' + filter;
    if (config) {
        sql.queryWithConfig(cmd, config, onQueryRest);
    } else {
        sql.query(cmd, onQueryRest);
    }
};

exports.queryRestInPromise = function (filter) {
    var deferred = Q.defer();
    this.queryRestOfMessage(filter, function (err, result) {
        if (err) {
            logger.error(err);
            return deferred.reject('服务器异常');
        }

        deferred.resolve(result);
    });


    return deferred.promise;
};
