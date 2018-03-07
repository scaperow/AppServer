var JPush = require("../node_modules/jpush-sdk/lib/JPush/JPush");
var appKey = '04a9114d351fc58f07f7e2d3';
var masterKey = '4f656e263de1a13dcd6029c8';
var logger = require('log4js').getLogger('notificationService');

exports.sendNotification = function (lineID, lineTag, testRoom, category, message, callback) {
    if (!message) {
        callback('message is null');
    }

    lineTag = lineTag || "";
    testRoom = testRoom || "";
    lineID = lineID || "";
    category = category || "";
    var tags = [];
    var tagCompany = "";
    switch (category + '') {
        case '4':
        case '5':
            tags.push(lineTag);
            break;

        default:
            tags.push(lineTag);
            tags.push(tagCompany);
            tags.push(lineTag + "_" + testRoom);

            if (testRoom.length >= 8) {
                tagCompany = lineTag + "_" + testRoom.substr(0, 8);
            }
            break;
    }


    var extras = {lid: lineID};
    var iOS = JPush.ios(message, '', 1, false, extras);
    var android = JPush.android(message, null, null, extras);
    var client = JPush.buildClient(appKey, masterKey);
    client.push().setPlatform('ios', 'android')
        .setAudience(JPush.tag(tags)) //set tags
        .setNotification('Hi, JPush', iOS, android)
        .setMessage(message)
        .send(callback);
}



