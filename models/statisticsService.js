var log4js = require("log4js");
var logger = log4js.getLogger("deviceService");
var config = require("../config/app.js");
var sql = require("../lib/sql");
var Q = require("q");
var _ = require("underscore");
var date = require("date-utils");
var base = require('../lib/baseInfo.js');
var random = require('random-key');
var story = require('story')(true);


var tsql = "\
-- 0 资料\r\n\
select testroomcode,count(1) as total,b.StatisticsCatlog  from sys_document a \r\n\
join sys_module b on a.moduleid=b.id\r\n\
where status>0 and b.moduletype=1  and  a.bgrq between \r\n\
'{0}' and '{1}' and {2} group by a.testroomcode,b.StatisticsCatlog\r\n\
\r\n\
-- 1 不合格资料\r\n\
SELECT testroomcode,count(1) as total,b.StatisticsCatlog  FROM dbo.sys_invalid_document a\r\n\
join sys_module b on a.moduleid=b.id\r\n\
WHERE AdditionalQualified=0  and status>0   and \r\n\
bgrq between '{0}' and '{1}'  AND  F_InvalidItem NOT LIKE '%#%' and {2} \r\n\
group by a.testroomcode,b.StatisticsCatlog\r\n\
\r\n\
-- 2 平行\r\n\
SELECT COUNT(1) as total,a.testroomcode,d.StatisticsCatlog \r\n\
FROM dbo.sys_document a JOIN dbo.sys_px_relation b ON a.ID=b.SGDataID \r\n\
JOIN dbo.sys_document c ON  b.PXDataID=c.ID join sys_module d on a.moduleID=d.id\r\n\
where a.status>0 and d.moduletype=1 AND a.bgrq between  '{0}' and '{1}'  AND c.bgrq between  '{0}' and '{1}'  \r\n\
and {2} group by a.testroomcode,d.StatisticsCatlog\r\n\
\r\n\
-- 3 见证\r\n\
select testroomcode,count(1) as total,b.StatisticsCatlog   from sys_document a \r\n\
join sys_module b on a.moduleid=b.id\r\n\
where status>0 and b.moduletype=1  and a.bgrq between \r\n\
  '{0}' and '{1}'  and {2} and a.trytype='见证' group by a.testroomcode,b.StatisticsCatlog\r\n\
\r\n\
-- 4 未处理资料\r\n\
SELECT testroomcode,count(1) as total,b.StatisticsCatlog  FROM dbo.sys_invalid_document a\r\n\
join sys_module b on a.moduleid=b.id\r\n\
WHERE AdditionalQualified=0  and status>0   and (DealResult='' OR DealResult IS NULL) and\r\n\
bgrq between '{0}' and '{1}' AND  F_InvalidItem NOT LIKE '%#%'\r\n\
and {2} group by a.testroomcode,b.StatisticsCatlog\r\n\
\r\n\
-- 5 已经处理资料\r\n\
SELECT testroomcode,count(1) as total,b.StatisticsCatlog  FROM dbo.sys_invalid_document a\r\n\
join sys_module b on a.moduleid=b.id\r\n\
WHERE AdditionalQualified=0  and status>0   and (DealResult IS NOT NULL) and\r\n\
bgrq between '{0}' and '{1}' AND  F_InvalidItem NOT LIKE '%#%'\r\n\
 and {2} group by a.testroomcode,b.StatisticsCatlog\r\n\
\r\n\
-- 6 登录次数\r\n\
SELECT testroomcode, COUNT(1) as total  FROM dbo.sys_loginlog WHERE  FirstAccessTime between '{0}' and '{1}' \r\n\
AND len(testroomcode)>12  group by testroomcode\r\n\
\r\n\
-- 7 人员\r\n\
select 1\r\n\
\r\n\
-- 8 资料总数\r\n\
select testroomcode,count(1) as total from sys_document a \r\n\
join sys_module b on a.moduleid=b.id\r\n\
 and {2}  where status>0 and b.moduletype=1  group by a.testroomcode\r\n\
";

var getPercentage = function (divisor, dividend) {
    if (divisor === 0) {
        return '0.00%';
    }

    return (divisor * 100 / dividend).toFixed(2) + '%';
}

var reduceAll = function (array) {
    return array.reduce(function (previousValue, currentValue) {
        return {total: previousValue.total + currentValue.total};
    }, {total: 0}).total;
}

var reduceUseModule = function (array, module) {
    modules = [];
    if (_.isArray(module) === false) {
        modules.push(module);
    } else {
        modules = module;
    }

    var arrayFilter = _.filter(array, function (item) {
        return _.contains(modules, item.StatisticsCatlog);
    });

    return reduceAll(arrayFilter);
}

var reduceAllItems = function (name, struct, arrayOfAll, arrayOfInvalid, arrayOfParallel, arrayOfWitness, module) {
    var total = reduceUseModule(arrayOfAll, module)
        , invalid = reduceUseModule(arrayOfInvalid, module)
        , parallel = reduceUseModule(arrayOfParallel, module)
        , witness = reduceUseModule(arrayOfWitness, module);

    struct['totalOf' + name] = total;
    struct['invalidOf' + name] = invalid;
    struct['witnessOf' + name] = getPercentage(parallel, total);
    struct['parallelOf' + name] = getPercentage(witness, total);
}

var reduceTotalItems = function (name, struct, arrayOfAll, arrayOfInvalid, module) {
    var total = reduceUseModule(arrayOfAll, module)
        , invalid = reduceUseModule(arrayOfInvalid, module);

    struct['totalOf' + name] = total;
    struct['invalidOf' + name] = invalid;
}

var reduceProcessItems = function (name, struct, arrayOfNotProcess, arrayOfProcessed, module) {

    console.log(name + 'reduceProcessItems');
    var notProcess = reduceUseModule(arrayOfNotProcess, module)
        , processed = reduceUseModule(arrayOfProcessed, module);

    struct['notProcessOf' + name] = notProcess;
    struct['processedOf' + name] = processed;
}

var structStatisticsOfDocument = function (result) {

    var deferred = Q.defer()
        , struct = {}
        , arrayOfInvalid = _.toArray(result[1])
        , arrayOfDocuments = _.toArray(result[0])
        , arrayOfParallel = _.toArray(result[2])
        , arrayOfWitness = _.toArray(result[3])
        , arrayOfNotProcess = _.toArray(result[4])
        , arrayOfProcessed = _.toArray(result[5])
        , arrayOfLoginTimes = _.toArray(result[6])
        , arrayOfMembers = _.toArray(result[7])
        , arrayOfDocumentAll = _.toArray(result[8]);

    struct.totalOfAllDocument = reduceAll(arrayOfDocumentAll);
    struct.totalOfDocuments = reduceAll(arrayOfDocuments);
    struct.totalOfInvalid = reduceAll(arrayOfInvalid);
    reduceTotalItems('CoreteMaterials', struct, arrayOfDocuments, arrayOfInvalid,
        ['粗骨料', '粉煤灰', '矿粉', '水泥', '速凝剂', '外加剂', '细骨料', '引气剂']);
    reduceAllItems('Cement', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '水泥');
    reduceAllItems('Fines', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '细骨料');
    reduceAllItems('Coarse', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '粗骨料');
    reduceAllItems('Flyash', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '粉煤灰');
    reduceAllItems('Admixture', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '外加剂');
    reduceAllItems('Powder', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '矿粉');
    reduceAllItems('Accelerator', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '速凝剂');
    reduceAllItems('Air', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '引气剂');

    reduceTotalItems('CoreteCompressive', struct, arrayOfDocuments, arrayOfInvalid,
        ['混凝土（标养）', '混凝土（同条件）']);
    reduceAllItems('Condition', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '混凝土（同条件）');
    reduceAllItems('Curing', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '混凝土（标养）');

    reduceTotalItems('SteelCatalog', struct, arrayOfDocuments, arrayOfInvalid,
        ['钢筋', '钢筋焊接', '钢筋机械连接']);
    reduceAllItems('Steel', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '钢筋');
    reduceAllItems('Welding', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '钢筋焊接');
    reduceAllItems('Connection', struct, arrayOfDocuments, arrayOfInvalid, arrayOfParallel, arrayOfWitness, '钢筋机械连接');
    reduceTotalItems('Other', struct, arrayOfDocuments, arrayOfInvalid, '其他');
    reduceProcessItems('Other', struct, arrayOfNotProcess, arrayOfProcessed, '其他');
    struct.totalOfLogins = reduceAll(arrayOfLoginTimes);

    deferred.resolve(struct);
    return deferred.promise;

}

var queryStatisticsOfDocument = function (startTime, endTime, other, config) {
    var deferred = Q.defer()
        , script = story(tsql, startTime, endTime, other);

    sql.queriesWithConfig(script, config, function (err, result) {
        if (err) {
            return deferred.reject('服务器异常');
        }

        return deferred.resolve(result);
    });

    return deferred.promise;
}


exports.documentForCompany = function (lineID, startTime, endTime, companyCode, callback) {
    var other = " SUBSTRING(a.testroomcode,0, 13) = '" + companyCode + "'";

    base.getConfig(lineID)
        .then(function (config) {
            return queryStatisticsOfDocument(startTime, endTime, other, config)
        })
        .then(structStatisticsOfDocument)
        .then(function (result) {
            callback(null, result);
        })
        .then(null, function (err) {
            console.log(err);
            callback(err);
        });

}


exports.documentForTestRoom = function (lineID, startTime, endTime, testRoomCode, callback) {
    var other = " a.testroomcode = '" + testRoomCode + "'";
    base.getConfig(lineID)
        .then(function (config) {
            return queryStatisticsOfDocument(startTime, endTime, other, config)
        })
        .then(structStatisticsOfDocument)
        .then(function (result) {
            callback(null, result);
        })
        .then(null, function (err) {
            callback(err);
        });

}



