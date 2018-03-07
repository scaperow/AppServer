var T = {
    message: $("#message").html(),
    tip: $('#tip').html(),
    report: $("#report").html(),
    memberOfSegment: $('#memberOfSegment').html(),
    memberOfTestRoom: $('#memberOfTestRoom').html(),
    memberEveryone: $('#memberEveryone').html(),
    deviceOfSegment: $('#deviceOfSegment').html(),
    deviceOfTestRoom: $('#deviceOfTestRoom').html(),
    deviceEveryone: $('#deviceEveryone').html(),
    totalOfSegment: $('#totalOfSegment').html(),
    totalOfTestRoom: $('#totalOfTestRoom').html(),
    buildUnqualified: function (id, lineName, location, time, content, hasStored, ext, type) {
        var result = T.message;
        result = result.replace(/{#line}/g, lineName)
            .replace(/{#location}/g, location)
            .replace(/{#time}/g, time)
            .replace(/{#content}/g, content)
            .replace(/{#id}/g, id)
            .replace(/{#ext}/g, ext);

        switch (type) {
            case 1:
                result = result.replace(/{#class_type}/g, "ui-icon-unqualified");
                break;

            case 2:
                result = result.replace(/{#class_type}/g, "ui-icon-keymodify");
                break;
        }

        if (hasStored) {
            //result = result.replace(/{#onStore}/g, "javascript:unstore(" + id + ",'" + ext + "')");
            result = result.replace(/{#class_store}/g, "ui-btn-active unstore");
        } else {
            result = result.replace(/{#class_store}/g, "store");
        }


        return result;
    },
    buidReportOfWeek: function (start, end, description) {
        var result = T.report;
        result = result.replace("#title", "周报")
            .replace("#start", start)
            .replace("#end", end)
            .replace("description", description)
            .replace("class", "ui-icon-week");

        return result;
    },
    buidReportOfMonth: function (title, start, end) {
        var result = T.report;
        result = result.replace("#title", "月报")
            .replace("#start", start)
            .replace("#end", end)
            .replace("description", description)
            .replace("class", "ui-icon-month");

        return result;
    },
    buildMember: function (members) {
        var result = '';
        $.each(members.segments, function (i, segment) {
            var mos = T.memberOfSegment;
            var mots = '';
            mos = mos.replace(/{#segmentName}/g, segment.name);
            mos = mos.replace(/{#companyName}/g, segment.companyName);
            mos = mos.replace(/{#total}/g, segment.total);
            $.each(segment.testRooms, function (i, testRoom) {
                var mot = T.memberOfTestRoom;
                var meos = '';
                mot = mot.replace(/{#name}/g, testRoom.name);
                mot = mot.replace(/{#total}/g, testRoom.total);

                $.each(testRoom.everyone, function (i, one) {
                    var meo = T.memberEveryone;
                    meo = meo.replace(/{#name}/g, one.name);
                    if (!one.phone || one.phone.length != 11) {
                        one.phone = '<i>暂无</i>';
                    }

                    var role = '';
                    switch (one.role) {
                        case 'YZ':
                            role = '业主';
                            break;
                        case 'ADMIN':
                            role = '管理员';
                            break;
                        case 'SGGQ':
                            role = '施工工区';
                            break;
                        case 'JL':
                            role = '监理';
                            break;
                        case 'SGZX':
                            role = '施工中心';
                            break;
                        case 'GGZX':
                            role = '工管中心';
                            break;
                        case 'SYY':
                            role = '实验员';
                            break;
                        case 'SYSZY':
                            role = '试验室主任';
                            break;
                    }

                    meo = meo.replace(/{#phone}/g, one.phone);
                    meo = meo.replace(/{#testRoomName}/g, testRoom.name);
                    meo = meo.replace(/{#segmentName}/g, segment.name);
                    meo = meo.replace(/{#role}/g, role);
                    meos += meo;
                });

                mot = mot.replace(/{#contentOfEveryone}/g, meos);
                mots += mot;
            });

            mos = mos.replace(/{#contentOfTestRoom}/g, mots);
            result += mos;

        });

        return result;
    },
    buildDevice: function (devices) {
        var result = '';
        $.each(devices.segments, function (i, segment) {
            var dos = T.deviceOfSegment;
            var dots = '';
            dos = dos.replace(/{#segmentName}/g, segment.name);
            dos = dos.replace(/{#companyName}/g, segment.companyName);
            dos = dos.replace(/{#total}/g, segment.total);
            $.each(segment.testRooms, function (i, testRoom) {
                var dot = T.deviceOfTestRoom;
                var deos = '';
                dot = dot.replace(/{#name}/g, testRoom.name);
                dot = dot.replace(/{#total}/g, testRoom.total);

                $.each(testRoom.everyone, function (i, one) {
                    var deo = T.deviceEveryone;
                    deo = deo.replace(/{#name}/g, one.name);
                    deo = deo.replace(/{#total}/g, one.total);
                    deos += deo;
                });

                dot = dot.replace(/{#contentOfEveryone}/g, deos);
                dots += dot;
            });

            dos = dos.replace(/{#contentOfTestRoom}/g, dots);
            result += dos;
        });

        return result;
    },
    buildTip: function (id, content, time, ext, hasStored) {
        var result = T.tip;
        result = result.replace(/{#id}/g, id);
        result = result.replace(/{#content}/g, content);
        result = result.replace(/{#time}/g, time);
        result = result.replace(/{#ext}/g, ext);

        if (hasStored) {
            //result = result.replace(/{#onStore}/g, "javascript:unstore(" + id + ",'" + ext + "')");
            result = result.replace(/{#class_store}/g, "ui-btn-active unstore");
        } else {
            result = result.replace(/{#class_store}/g, "store");
        }

        return result;
    },
    buildTotalList: function (segments) {
        var result = '';
        $.each(segments, function (i, segment) {
            $.each(segment.companies, function (i, company) {
                var mos = T.totalOfSegment;
                var mots = '';
                mos = mos.replace(/{#segmentName}/g, segment.name);
                mos = mos.replace(/{#companyName}/g, company.name);
                mos = mos.replace(/{#total}/g, segment.total);
                $.each(company.testRooms, function (i, testRoom) {
                    var mot = T.totalOfTestRoom;
                    mot = mot.replace(/{#name}/g, testRoom.name);
                    mot = mot.replace(/{#total}/g, testRoom.total);
                    mots += mot;
                });
                mos = mos.replace(/{#contentOfTestRoom}/, mots);
                result += mos;
            });
        });

        console.log(result);
        return result;

    }
};

exports = T;