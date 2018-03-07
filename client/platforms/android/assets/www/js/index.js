/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//org/msg/report/fav
var currentPage = 'org',
    acceptNotification = true,
    maxMessageID = 0,
    maxWeekReportID = 0,
    maxMonthReportID = 0,
    maxTinyTipID = 0,
    maxFavoriteID = 0,
    restNumbers = {},
    reportMaxWeek = 0,
    statisticsCodeName,
    statisticsCode,
    statisticsStartDate,
    statisticsEndDate,
    doList;

var currentUser, currentLine, currentLineID;

var app = function () {

    Date.prototype.format = function (format) {
        /*                                                    d
         * eg:format="YYYY-MM-dd hh:mm:ss";
         */
        var o = {
            "M+": this.getMonth() + 1, // month
            "d+": this.getDate(), // day
            "h+": this.getHours(), // hour
            "m+": this.getMinutes(), // minute
            "s+": this.getSeconds(), // second
            "q+": Math.floor((this.getMonth() + 3) / 3), // quarter
            "S": this.getMilliseconds()
            // millisecond
        };

        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (this.getFullYear() + "")
                .substr(4 - RegExp.$1.length));
        }

        for (var k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k]
                    : ("00" + o[k]).substr(("" + o[k]).length));
            }
        }
        return format;
    };

    function syncUserProfile() {
        var basicToken = localStorage["basicToken"],
            userID = localStorage.userID;

        if (basicToken && userID) {
            $.mobile.loading("show", {
                textVisible: false
            });

            $.ajax({
                url: config.serviceURI + 'user/' + userID,
                type: "GET",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + basicToken);
                },
                success: function (userProfile) {
                    $.mobile.loading("hide");
                    if (userProfile.error) {
                        tip(userProfile.error);
                        $.mobile.changePage('#pageLogin', {transition: 'flip'});
                    }

                    currentUser = userProfile;
                    initializeAppForUser(userProfile);
                },
                error: function (jqXHR, status, result) {
                    tip('不能正常访问服务器,程序将退出');
                    navigator.app.exitApp();
                }
            });
        } else {

            $.mobile.changePage('#pageLogin', {transition: 'flip'});
        }
    }

    function initializeAppForUser(userProfile) {
        var now = new Date().getTime();
        if (!config.isDebug && acceptNotification && userProfile.tags && userProfile.tags.length > 0) {
            window.plugins.jPushPlugin.setTagsWithAlias(userProfile.tags, now);
        }

        initializeLinePanel(userProfile);

        if (userProfile.lastLine) {
            currentLineID = userProfile.lastLine.ID;
            currentLine = userProfile.lastLine;
            var lineKey = 'line-' + currentLineID;
            localStorage[lineKey] = JSON.stringify(userProfile.lastLine);
            loadLine(userProfile.lastLine);
        }
    }

    function _switchLine(lineID, activePage, success) {
        var lineKey,
            basicToken = localStorage['basicToken'];

        $.mobile.loading("show", {
            textVisible: false
        });

        $.ajax({
            url: config.serviceURI + 'switch/' + localStorage['userID'] + '/' + localStorage['userName'] + '/' + lineID,
            type: "get",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", "Basic " + basicToken);
            },
            success: function (lineInfo) {
                lineKey = 'line-' + lineInfo.ID;
                localStorage[lineKey] = JSON.stringify(lineInfo);
                loadLine(lineInfo, activePage);

                if (success) {
                    success();
                }

                $.mobile.loading("hide", {
                    textVisible: false
                });
            },
            error: function (jqXHR, status, result) {
                loading.hide();

                tip('应用异常');
            }
        });
    }

    function initializeLinePanel(userProfile) {
        var list = $('#listLines').html(''),
            html = '',
            href = '';

        //add the new list content
        if (userProfile.lines && userProfile.lines.length > 0) {
            for (var i = 0; i < userProfile.lines.length; i++) {
                href = "javascript:switchLine('" + userProfile.lines[i].ID + "')";
                html += "<li ><a href=" + href + "> " + userProfile.lines[i].name + "</a></li > ";
            }
        }

        if (userProfile.lines.length <= 1) {
            $("a[role='switchLineTag']").hide();
        }

        list.html(html);
        list.listview('refresh');
    }

    function loadLine(line, activePage) {
        activePage = activePage || '#pageHome';
        currentLine = line;
        currentLineID = line.ID;
        maxMessageID = 0;
        maxMonthReportID = 0;
        maxWeekReportID = 0;
        maxTinyTipID = 0;

        $('.line-name').text(line.name);
        $('#listMessage li:first').show();
        $('#listMessage li').not('li:first').remove();
        $('#listTinyTip li:first').show();
        $('#listTinyTip li').not('li:first').remove();
        $.mobile.changePage(activePage, { reloadPage: false, transition: "slide"});
        _renderHistoryMessages();
        _renderHistoryTips();
    }

    function _renderFavoriteMessages() {
        var html = '',
            status = $('#buttonLoadFavorite'),
            list = $('#listFavorite');

        $('#listFavorite li').not('li:first').remove();
        status.show('fast');

        db.queryMessage(null, null, null, " isStore = 1 AND lineID = '" + currentLineID + "'", function (err, result) {
            if (err) {
                return status.html('没有查询到数据');
            }

            if (result && result.rows.length > 0) {
                for (var i = 0; i < result.rows.length; i++) {
                    var r = result.rows.item(i);

                    switch (r.type) {
                        //不合格报警短信，关键字段修改信息
                        case 1:
                        case 2:
                            html = T.buildUnqualified(r.id,
                                r.lineName,
                                r.segmentName + ' ' + r.companyName + ' ' + r.testRoomName,
                                new Date(r.sendTime).toLocaleString(),
                                r.msgFull,
                                r.isStore === 1 ? true : false,
                                'store',
                                r.type) + html;
                            break;

                        //温馨提示
                        case 10:
                            html = T.buildTip(r.id, r.msgFull, new Date(r.sendTime).toLocaleString(), 'store', true) + html;
                            break;
                    }
                }
            }

            status.after(html);
            list.listview('refresh');
            status.hide('fast');
            bindStoreEvent();
        });
    }

    function _renderHistoryMessages(maxID) {
        var status = $('#buttonLoadMessage'),
            list = $('#listMessage');

        maxID = maxID || 0;
        db.queryMessage(null, maxID, 1, " lineID = '" + currentLineID + "'", function (err, result) {
            if (err) {
                return console.log(err);
            }

            var html = '';
            if (result && result.rows.length > 0) {
                for (var i = 0; i < result.rows.length; i++) {
                    var r = result.rows.item(i);
                    maxMessageID = r.id > maxMessageID ? r.id : maxMessageID;
                    html = T.buildUnqualified(r.id,
                        r.lineName,
                        r.segmentName + ' ' + r.companyName + ' ' + r.testRoomName,
                        new Date(r.sendTime).toLocaleString(),
                        r.msgFull,
                        r.isStore === 1 ? true : false,
                        'msg',
                        r.type) + html;
                }
            }

            status.after(html);
            list.listview('refresh');
            bindStoreEvent();
        });
    }

    function _refreshMessages() {
        var status = $('#buttonLoadMessage')
            , list = $('#listMessage')
            , html = '';

        status.text('正在加载 请稍后...');
        status.show('fast');

        $.ajax({
            url: config.serviceURI + 'msg/' + currentLineID + '/' + localStorage['userID'] + '/' + maxMessageID + '/1',
            type: "GET",
            contentType: 'application/json',
            success: function (result) {
                if (result) {
                    var rest = result.rest,
                        msgs = result.msgs;

                    if (msgs.length == 0) {
                        status.text('无未读消息');
                        setTimeout(function () {
                            status.hide('fast');
                        }, 1000);
                    }

                    $.each(msgs, function (i, msg) {
                            db.saveMessage(msg.ID + '', msg.LineID + '', msg.TestRoomCode + '', msg.MsgFull + '', msg.SendTime + '', msg.LineName + '', msg.SegmentName + '', msg.CompanyName + '', msg.TestRoomName + '', 0 + '', msg.MsgType + '', msg.Msg, function (err) {
                                if (err) {
                                    return console.log(msg.ID + "-" + err.code);
                                }

                                maxMessageID = maxMessageID < msg.ID ? msg.ID : maxMessageID;
                                html = T.buildUnqualified(msg.ID
                                    , msg.LineName
                                    , msg.SegmentName + ' ' + msg.CompanyName + ' ' + msg.TestRoomName
                                    , new Date(msg.SendTime).toLocaleString()
                                    , msg.MsgFull
                                    , false
                                    , 'msg'
                                    , msg.MsgType) + html;

                                if (i + 1 === msgs.length) {

                                    if (rest === 0) {
                                        status.text('无未读消息');
                                        setTimeout(function () {
                                            status.hide('fast');
                                        }, 1000);
                                    } else {
                                        status.text('还有' + rest + '条未读消息');
                                    }

                                    if (maxMessageID === 0) {
                                        status.text('当前没有数据');
                                    } else {
                                        status.after(html);
                                        list.listview('refresh');
                                        bindStoreEvent();
                                    }
                                }
                            });
                        }
                    );
                } else {
                    status.text('当前没有数据');
                }
            },
            error: function (jqXHR, status, result) {
                loading.hide();
                status.text('服务器异常');
            }
        });
    }

    function _refreshRestNumber() {
        if (!currentLineID || !currentUser) {
            return;
        }

        var refreshRestOfMessage = function (container) {
            $.ajax({
                url: config.serviceURI + 'msg/rest/' + currentLineID + '/' + currentUser.userID + '/' + maxMessageID + '/1',
                type: "GET",
                contentType: 'application/json',
                success: function (result) {
                    if (result.error) {
                        return console.log(result.error);
                    }

                    _setRestNumber(result.rest, container);
                },
                error: function (xhr) {
                    console.log(xhr);
                }
            });
        };

        var refreshRestOfTinyTip = function (container) {
            $.ajax({
                url: config.serviceURI + 'tip/rest/' + maxTinyTipID + '/' + currentLineID,
                type: "GET",
                contentType: 'application/json',
                success: function (result) {
                    if (result.error) {
                        return console.log(result.error);
                    }

                    if (result.rest > 0) {
                        $('#loadButton').show();
                    } else {
                        $('#loadButton').hide();
                    }

                    _setRestNumber(result.rest, container);
                },
                error: function (xhr) {
                    console.log(xhr);
                }
            });
        };

        refreshRestOfMessage('#menuMsg');
        refreshRestOfTinyTip('#menuTinyTip');
        initReportMsgNum(4);
        initReportMsgNum(5);
    }

    function _refreshMembers() {
        if (!currentLineID) {
            return;
        }

        $('#memberList').html('');
        $.mobile.loading("show", {
            textVisible: false
        });

        $.ajax({
            url: config.serviceURI + 'testroom/members/' + currentLineID,
            type: "GET",
            contentType: 'application/json',
            success: function (result) {
                if (result.error) {
                    return console.log(result.error);
                }

                var r = T.buildMember(result);
                $('#memberList').append(r);
                $('#memberList').collapsibleset('refresh');
                $('#pageMembers ul[data-role="listview"]').listview();
                $('#pageMembers ul[data-role="listview"]').listview('refresh');
                $.mobile.loading("hide", {
                    textVisible: false
                });
            },
            error: function (xhr) {
                $.mobile.loading("hide", {
                    textVisible: false
                });
                console.log(xhr);
            }
        });
    }

    function _refreshDevices() {
        if (!currentLineID) {
            return;
        }

        $('#deviceList').html('');
        $.mobile.loading("show", {
            textVisible: false
        });

        $.ajax({
            url: config.serviceURI + 'device/devices/' + currentLineID,
            type: "GET",
            contentType: 'application/json',
            success: function (result) {
                if (result.error) {
                    return console.log(result.error);
                }

                var r = T.buildDevice(result);
                $('#deviceList').append(r);
                $('#deviceList').collapsibleset('refresh');
                $('#deviceList ul[data-role="listview"]').listview();
                $('#deviceList ul[data-role="listview"]').listview('refresh');

                $.mobile.loading("hide", {
                    textVisible: false
                });
            },
            error: function (xhr) {
                $.mobile.loading("hide", {
                    textVisible: false
                });
                console.log(xhr);
            }
        });
    }

    function _refreshStatistics() {
        if (!currentLineID) {
            return;
        }

        $.mobile.loading("show", {
            textVisible: false
        });

        $.ajax({
            url: config.serviceURI + 'testRoom/testRooms/' + currentLineID,
            type: "GET",
            contentType: 'application/json',
            success: function (result) {
                $.mobile.loading("hide");

                if (result) {
                    if (result.error) {
                        return tip(result.error);
                    }

                    $('#statisticsList').html('');
                    var html = '';
                    $.each(result.segments, function (i, segment) {
                        $.each(segment.companies, function (i, company) {
                            var href = "javascript:showDetailsOfStatistics('" + company.code + "','company','')";
                            html += '<li><a href= ' + href + '>' + segment.name + ' ' + company.name + '</a></li>';

                        });
                    });
                    $('#statisticsList').html(html);
                    $('#statisticsList').listview('refresh');
                }
            },
            error: function (xhr) {
                $.mobile.loading("hide");
                tip('应用错误');
            }
        });
    }

    function _refreshTinyTip() {
        var status = $('#buttonLoadTinyTip'),
            list = $('#listTinyTip'),
            html = '';

        status.text('正在加载');
        status.show();

        $.ajax({
            url: config.serviceURI + 'tip/' + maxTinyTipID + '/' + currentLineID,
            type: 'GET',
            contentType: 'application/json',
            success: function (result) {
                if (result) {
                    if (result.error) {
                        status.hide();
                        return tip(result.error);
                    }

                    $.each(result.msg, function (i, tip) {
                        db.saveOne(tip, function (err) {
                            if (err) {
                                return console.log(err);
                            }

                            maxTinyTipID = tip.ID > maxTinyTipID ? tip.ID : maxTinyTipID;
                            html = T.buildTip(tip.ID, tip.MsgFull, new Date(tip.SendTime).toLocaleString(), 'tip', 0) + html;

                            if (i + 1 === result.msg.length) {
                                status.after(html);
                                list.listview('refresh');

                                bindStoreEvent();
                            }
                        });
                    });

                    if (result.rest === 0) {
                        status.text('没有更多的消息');
                        setTimeout(function () {
                            status.hide('fast');
                        }, 2000);
                    } else {
                        status.text('还有' + result.rest + '条未读提示');
                    }

                }

            },
            error: function (xhr) {
                status.text('服务器异常');
                setTimeout(function () {
                    status.hide('fast');
                }, 2000);
            }
        });
    }

    function _renderHistoryTips() {
        var status = $('#buttonLoadTinyTip'),
            list = $('#listTinyTip'),
            html = '';

        if (!currentLineID) {
            return;
        }

        $('#listTinyTip li').not('li:first').remove();

        status.show();

        db.queryMessage(null, 0, 10, " lineID = '" + currentLineID + "'", function (err, result) {
            if (err) {
                return logger.error(err);
            }

            for (var i = 0; i < result.rows.length; i++) {
                var item = result.rows.item(i);
                maxTinyTipID = item.id > maxTinyTipID ? item.id : maxTinyTipID;
                html = T.buildTip(item.id,
                    item.msgFull,
                    new Date(item.sendTime).toLocaleString(),
                    'tip',
                    item.isStore === 1 ? true : false) + html;

            }

            status.after(html);
            status.hide();
            list.listview('refresh');
            bindStoreEvent();
        });
    }

    function _refreshStadium() {

        $.mobile.changePage('#pageStadium', {transition: 'slide'});
        loading.show();

        var bindRequest = function (data) {
            $('i[bind="total-request"]').text(data.total);
            $('#listRequest').html(T.buildTotalList(data.segments));
            $('#listRequest').collapsibleset();
            $('#listRequest').collapsibleset('refresh');
            $('#listRequest ul[data-role="listview"]').listview();
            $('#listRequest ul[data-role="listview"]').listview('refresh');
        }

        var bindInvalid = function (data) {
            $('i[bind="total-invalid"]').text(data.total);
            $('#listInvalid').html(T.buildTotalList(data.segments));
            $('#listInvalid').collapsibleset();
            $('#listInvalid').collapsibleset('refresh');
            $('#listInvalid ul[data-role="listview"]').listview();
            $('#listInvalid ul[data-role="listview"]').listview('refresh');
        }

        var bindStadium = function (data) {
            $('i[bind="total-stadium"]').text(data.total);
            $('#listStadium').html(T.buildTotalList(data.segments));
            $('#listStadium').collapsibleset();
            $('#listStadium').collapsibleset('refresh');
            $('#listStadium ul[data-role="listview"]').listview();
            $('#listStadium ul[data-role="listview"]').listview('refresh');
        }

        var bindOverTime = function (data) {
            $('i[bind="total-overtime"]').text(data.total);
            $('#listOverTime').html(T.buildTotalList(data.segments));
            $('#listOverTime').collapsibleset();
            $('#listOverTime').collapsibleset('refresh');
            $('#listOverTime ul[data-role="listview"]').listview();
            $('#listOverTime ul[data-role="listview"]').listview('refresh');
        }


        $.ajax({
            url: config.serviceURI + 'testRoom/dolist/' + currentUser.userID + '/' + currentLineID,
            type: 'GET',
            contentType: 'application/json',
            success: function (result) {
                loading.show();
                if (result) {
                    if (result.error) {
                        loading.hide();

                        return tip(result.error);

                    } else {

                        bindStadium(result.testResult);
                        bindInvalid(result.invalidResult);
                        bindRequest(result.requestResult);
                        bindOverTime(result.overTimeResult);

                        loading.hide();
                    }
                }
            }, error: function (xhr) {
                loading.hide();
                tip('应用异常');
            }});
    }

    function initializeUI() {
        $('#loginButton').click(function (e) {
            $.mobile.loading("show", {
                textVisible: false
            });

            var data = {
                userName: $('#name').val(),
                password: $('#password').val()
            };

            $.ajax({
                url: config.serviceURI + 'login',
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function (userProfile) {
                    localStorage['userName'] = data.userName;
                    localStorage['password'] = data.password;
                    localStorage['userID'] = userProfile.userID;
                    localStorage['basicToken'] = btoa(userProfile.userID + ':' + data.password);

                    $.mobile.loading("hide", {
                        textVisible: false
                    });

                    if (userProfile.error) {
                        return tip(userProfile.error);
                    }
                    currentUser = userProfile;
                    initializeAppForUser(userProfile);
                },
                error: function (jqXHR, status) {
                    $.mobile.loading("hide");
                    tip('应用发生错误');
                }
            });
        });
        $("#passwordButton").click(function (e) {
            $.ajax({
                url: config.serviceURI + 'login/' + $('#name').val(),
                type: "GET",
                success: function (result) {
                    $('#passwordButton').attr('disabled', '');
                    var count = 60;
                    var loop = function () {
                        $('#passwordButton').addClass("ui-state-disabled");
                        $('#passwordButton').text(--count + ' 秒后重新获取密码');

                        if (count <= 0) {
                            $('#passwordButton').text('获取密码');
                            $('#passwordButton').removeClass("ui-state-disabled");
                        } else {
                            setTimeout(loop, 1000);
                        }
                    }

                    loop();
                },
                error: function (jqXHR, status, result) {
                    tip('应用异常');
                }
            });
        });
        $('#sigoutButton').click(function () {
            localStorage.clear();

            var database = db.getMessageDatabaseInstance();
            database.transaction(function (tx) {
                tx.executeSql('DELETE FROM MESSAGE');
            });

            $.mobile.changePage('#pageLogin', {transition: 'flip'});
        });
        $("#loadButton").click(function () {
            _refreshMessages();
        });
        $('#pageHome').on('pageshow', function (event) {
            $.mobile.navigate.history.stack = [];
            _refreshRestNumber();
//            initReportMsgNum(4);
//            initReportMsgNum(5);
        });
        $('#pageMsg').on('pageshow', function (event) {
            _refreshMessages();
        });
        $('#pageMembers').on('pageshow', function (event) {
            _refreshMembers();
        });
        $('#pageDevices').on('pageshow', function (event) {
            _refreshDevices();
        });
        $('#pageFavorite').on('pageshow', function (event) {
            _renderFavoriteMessages();
        });
        $('#pageStatistics').on('pageshow', function (event) {
            _refreshStatistics();
        });
        $('#menuState').click(function () {
            $.mobile.changePage('#pageState1', {transition: 'slide'});
            $.mobile.loading('show', {textVisible: false});

            $.ajax({
                url: config.serviceURI + 'testRoom/testRooms/' + currentLineID,
                type: "GET",
                contentType: 'application/json',
                success: function (result) {
                    $.mobile.loading("hide");

                    if (result) {
                        if (result.error) {
                            return tip(result.error);
                        }

                        $('#listState1').html('');
                        var html = '';
                        $.each(result.segments, function (i, segment) {
                            $.each(segment.companies, function (i, company) {
                                var href = "javascript:showState2('" + segment.code + "','" + company.code + "','基本情况')";
                                html += '<li><a href= ' + href + '>' + segment.name + ' ' + company.name + '</a></li>';
                            });
                        });
                        $('#listState1').html(html);
                        $('#listState1').listview('refresh');
                    }
                },
                error: function (xhr) {
                    loading.hide();
                    tip('应用异常');
                }
            });
        });
        $('#buttonResetPassword').click(function () {
            var data = {oldPassword: $('#oldPassword').val(),
                newPassword: $('#newPassword').val(),
                userID: currentUser.userID};

            if (newPassword !== $('#retryPassword').val()) {
                return tip('两次密码输入不一致');
            }


            $.ajax({
                url: config.serviceURI + 'user/resetPassword',
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + localStorage['basicToken']);
                },
                success: function (result) {
                    if (result && result.error) {
                        return tip(result.error);
                    }

                    $('#formResetPassword')[0].reset();
                    localStorage.clear();
                    tip('修改成功, 请重新登陆');
                    $.mobile.changePage('#pageLogin', {transition: 'slide'});
                },
                error: function (jqXHR, status, result) {
                    tip('应用异常');
                }
            });
        });
        //$('.datepicker').mobiscroll().date({theme: "mobiscroll", mode: "scroller", display: "modal", lang: ""});
        $('#filterStatistics').click(function () {
            if ($('#filterStatistics').hasClass('ui-btn-active')) {
                $('#filterStatistics').removeClass('ui-btn-active');
                $('#regionTimeStatistics').hide('fast');
            } else {
                $('#filterStatistics').addClass('ui-btn-active');
                $('#regionTimeStatistics').show('fast');
            }
        });
        $('#dateStatisticsStart').change(function () {
            _reshowDetailsOfStatistics();
        });
        $('#dateStatisticsEnd').change(function () {
            _reshowDetailsOfStatistics();
        });
        $('#pageTinyTip').on('pageshow', function (event) {
            _refreshTinyTip();
        });
        $('#buttonLoadMessage').click(function () {
            _refreshMessages();
        });
        $('#buttonLoadTinyTip').click(function () {
            _refreshTinyTip();
        });
        $('#buttonStadium').click(function () {
            _refreshStadium();
        });

        $('ul[data-role="listview"]').listview();
    }

    function bindStoreEvent() {
        $('.store').click(function (e) {
            var btn = $(e.currentTarget);
            var oid = btn.attr('oid');

            db.modifyMessage({isStore: 1}, oid, function (err) {
                if (err) {
                    return console.log(err);
                }

                btn.addClass('ui-btn-active');
                btn.removeClass('store');
                btn.addClass('unstore');

                bindStoreEvent();
            });


        });

        $('.unstore').click(function (e) {

            var btn = $(e.currentTarget);
            var oid = btn.attr('oid');
            var ext = btn.attr('ext');
            var cid = btn.attr('cid');

            db.modifyMessage({isStore: 0}, oid, function (err) {
                if (err) {
                    return console.log(err);
                }

                btn.removeClass('ui-btn-active');
                btn.removeClass('unstore');
                btn.addClass('store');
                $('#' + cid).hide('fast', function () {
                    $('#' + cid).remove();
                });

                bindStoreEvent();
            });

        });
    }

    function searchFavoriteMessage(keyword) {
        db.queryMessage(null, null, 1, " msgFull like '%" + keyword + "%' AND lineID = '" + currentLineID + "' AND isStore = 1", function (err, result) {
            if (err) {
                return console.log(err);
            }

            $('#favoriteList').html('');
            if (result && result.rows.length > 0) {
                for (var i = 0; i < result.rows.length; i++) {
                    var msg = result.rows.item(i);
                    var messagesHtml = T.buildUnqualified(msg.id
                        , msg.lineName
                        , msg.segmentName + ' ' + msg.companyName + ' ' + msg.testRoomName
                        , new Date(msg.sendTime).toLocaleString()
                        , msg.msgFull
                        , true
                        , 'store'
                        , msg.type);
                    $('#favoriteList').prepend(messagesHtml);
                }
            }
        });
    }

    function _refreshStoreMessages() {
        _renderFavoriteMessages();
    }

    function _showMessageOnAndroid(data) {
        var extras = data.extras['cn.jpush.android.EXTRA'];
        var lineID = extras.lid;

        if (lineID) {
            if (currentLineID === lineID) {
                $.mobile.changePage('#pageMsg', {transition: 'slide'});
            } else {
                _switchLine(lineID, '#pageMsg');
            }
        }
    }

    function _setRestNumber(count, containerID) {
        var container = $(containerID);
        if (!container) {
            return;
        }

        var render = function (count, region) {
            if (count <= 0) {
                return;
            }

            if (count > 100) {
                count = '99+';
            }
            var span = $('<span class="unread" style="display: none">' + count + '</span>');

            region.prepend(span);
            span.show('fast');
        }

        var items = container.find('.unread');

        if (items) {
            if (restNumbers[containerID] !== count) {
                if (items.length > 0) {
                    items.hide('fast', function () {
                        items.remove();
                        render(count, container);
                    });
                } else {
                    render(count, container);
                }
            }
        }

        restNumbers[containerID] = count;
    }

    function tip(messsage) {
        if (config.isDebug) {
            alert(messsage);
        } else {
            window.plugins.toast.showLongBottom(message);
        }
    }

    function _showDetailsOfStatistics(code, codeType, title) {
        $.mobile.changePage('#detailStatistics', {transition: 'slide'});
        $.mobile.loading('show', {textVisible: false});

        var widthOfBody = $('#bodyDetailStatistics').width();
        var start = new Date();
        start.setMonth(start.getMonth() - 3);
        statisticsStartDate = statisticsStartDate || start.format('yyyy-MM-dd');
        statisticsEndDate = statisticsEndDate || new Date().format('yyyy-MM-dd');
        statisticsCode = code;
        statisticsCodeName = codeType;

        title = title || '资料统计';
        $('#title-statistics').html(title);

        var appendRow = function (display, name, row) {
            var tr = "<tr><th>" + display +
                "</th><td>" + row["totalOf" + name] +
                "</td><td>" + row["invalidOf" + name] +
                "</td><td>" + row["witnessOf" + name] +
                "</td><td>" + row["parallelOf" + name] +
                "</td></tr>";

            return tr;
        }

        var appendLiteRow = function (display, name, row) {
            var tr = "<tr class='catalog'><th>" + display +
                "</th><td>" + row["totalOf" + name] +
                "</td><td>" + row["invalidOf" + name] +
                "</td><td>" +
                "</td><td>" +
                "</td></tr>";

            return tr;
        }

        $.ajax({
            url: config.serviceURI + 'statistics/doc/' + codeType + '/' + code + '/' + currentLineID + '/' + statisticsStartDate + '/' + statisticsEndDate,
            type: "GET",
            success: function (result) {
                if (result) {
                    if (result.error) {
                        return tip(result.error);
                    }

                    var html = '';

                    html += '<table data-role="table" data-mode="reflow" id="tableDetailStatistics" class="ui-responsive">';
                    html += '<thead>';
                    html += '<tr>';
                    html += '<td> </td>';
                    html += '<td>资料数</td>';
                    html += '<td>不合格数</td>';
                    html += '<td>平行率</td>';
                    html += '<td>见证率</td>';
                    html += '</tr>';
                    html += '</thead>';
                    html += '<tbody>';
                    //html+=appendLiteRow('混凝土原材','CoreteMaterials', result);
                    html += appendRow('水泥', 'Cement', result);
                    html += appendRow('细骨料', 'Fines', result);
                    html += appendRow('粗骨料', 'Coarse', result);
                    html += appendRow('粉煤灰', 'Flyash', result);
                    html += appendRow('外加剂', 'Admixture', result);
                    html += appendRow('速凝剂', 'Accelerator', result);
                    html += appendRow('引气剂', 'Air', result);
                    //html += appendLiteRow('混凝土抗压', 'CoreteCompressive', result);
                    html += appendRow('混凝土同条件', 'Condition', result);
                    html += appendRow('混凝土标养', 'Curing', result);
                    //html += appendLiteRow('钢筋试验', 'SteelCatalog', result);
                    html += appendRow('钢筋原材', 'Steel', result);
                    html += appendRow('钢筋焊接', 'Welding', result);
                    html += appendRow('钢筋接头', 'Connection', result);
                    html += appendLiteRow('其他', 'Other', result);
                    html += '</tbody></table>';
                    $('#bodyDetailStatistics').html(html);
                    $('#tableDetailStatistics').table();
                    $('#filterStatistics').removeClass('ui-btn-active');
                    $('#regionTimeStatistics').hide('fast');
                    loading.hide();
                }
            },
            error: function (jqXHR, status, result) {
                $.mobile.loading('hide');

            }
        });
    }

    function _reshowDetailsOfStatistics() {
        var start = new Date($('#dateStatisticsStart').val());
        var end = new Date($('#dateStatisticsEnd').val());

        if (start < end) {
            statisticsStartDate = start.format('yyyy-MM-dd');
            statisticsEndDate = end.format('yyyy-MM-dd');

            _showDetailsOfStatistics(statisticsCode, statisticsCodeName);
        } else {
            tip('开始时间不能大于结束日期');
        }
    }

    function _showTestRoom(code, codeType, title) {
        $.mobile.changePage('#pageTestRoom', {transition: 'slide'});
        loading.show();

        $('#bind-test-company').html('');
        $('#bind-test-test').html('');
        $('#bind-test-master').html('');
        $('#bind-test-address').html('');
        $('#bind-test-ename').html('');
        $('#bind-test-tel').html('');
        $('#bind-test-mname').html('');
        $('#bind-test-mtel').html('');
        $('#bind-test-bname').html('');
        $('#bind-test-btel').html('');
        $('#bind-test-code').html('');
        $('#bind-test-fax').html('');
        $('#bind-test-tsize').html('');
        $('#bind-test-ssize').html('');
        $('#bind-test-items').html('');

        $.ajax({
            url: config.serviceURI + 'testRoom/information/' + currentLineID + '/' + code,
            type: 'GET',
            contentType: 'application/json',
            success: function (result) {
                loading.hide();
                if (result) {
                    if (result.error) {
                        return tip(result.error);
                    }

                    $('#bind-test-company').html(result.companyName);
                    $('#bind-test-test').html(result.testRoomName);
                    $('#bind-test-master').html(result.testRoomName);
                    $('#bind-test-address').html(result.address);
                    $('#bind-test-ename').html(result.ename);
                    $('#bind-test-tel').html(result.etel);
                    $('#bind-test-mname').html(result.mname);
                    $('#bind-test-mtel').html(result.mtel);
                    $('#bind-test-bname').html(result.bname);
                    $('#bind-test-btel').html(result.btel);
                    $('#bind-test-code').html(result.code);
                    $('#bind-test-fax').html(result.fax);
                    $('#bind-test-tsize').html(result.tsize);
                    $('#bind-test-ssize').html(result.ssize);
                    $('#bind-test-items').html(result.items);

                }
            }, error: function () {
                loading.hide();
                tip('应用异常');
            }
        })
    }

    function _showState2(segmentCode, companyCode, companyName) {
        $('#title-state2').html(companyName);
        $.mobile.changePage('#pageState2', {transition: 'slide'});
        $.mobile.loading('show', {textVisible: false});

        $.ajax({
            url: config.serviceURI + 'testRoom/testRooms/' + currentLineID,
            type: "GET",
            contentType: 'application/json',
            success: function (result) {
                $.mobile.loading("hide");

                if (result) {
                    if (result.error) {
                        return tip(result.error);
                    }

                    $('#listState2').html('');
                    var html = '';
                    $.each(result.segments, function (i, segment) {
                        if (segment.code !== segmentCode) {
                            return;
                        }

                        $.each(segment.companies, function (i, company) {
                            if (company.code !== companyCode) {
                                return;
                            }

                            $.each(company.testRooms, function (i, testRoom) {
                                var href = "javascript:showTestRoom('" + testRoom.code + "','testRoom','试验室信息')";
                                html += '<li><a href= ' + href + '>' + testRoom.name + '</a></li>';
                            });
                        });
                    });
                    $('#listState2').html(html);
                    $('#listState2').listview('refresh');
                }
            },
            error: function (xhr) {
                $.mobile.loading("hide");
                tip('应用异常');
            }
        });
    }

    return {
        // Application Constructor
        initialize: function () {

            initializeUI();

            this.bindEvents();

            if (config.isDebug) {
                config.serviceURI = config.debugServiceURI;
                this.onDeviceReady();
            }
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);

            if (!config.isDebug) {
                window.plugins.jPushPlugin.receiveMessageIniOSCallback = fonReceiveMessage;
                document.addEventListener("jpush.setTagsWithAlias", onTagsWithAlias, false);
            }
        },
        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function () {
            app.receivedEvent('deviceready');
            $(function () {
                syncUserProfile();
            });
        },
        // Update DOM on a Received Event
        receivedEvent: function (id) {
            console.log('Received Event: ' + id);
        },
        renderMessages: _renderHistoryMessages,
        refreshMessages: _refreshMessages,
        refreshStoreMessages: _refreshStoreMessages,
        showAndroidMessage: _showMessageOnAndroid,
        setRestNumber: _setRestNumber,
        refreshRestNumber: _refreshRestNumber,
        showDetailsOfStatistics: _showDetailsOfStatistics,
        showState2: _showState2,
        switchLine: _switchLine,
        showTestRoom: _showTestRoom,
        showiOSMessage: function (data) {
            tip(data);
        }
    };
}();

var db = function () {
    function _getMessageDatabaseInstance() {
        return openDatabase(config.databaseName, config.databaseVersion, config.databaseDisplayName, 20 * 1024 * 1024);
    }

    function _execute(tsql, values, callback) {
        var database = db.getMessageDatabaseInstance();
        database.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS MESSAGE (id integer primary key , lineID, testroomcode,msgFull,sendTime,lineName, segmentName, companyName, testRoomName, isStore integer, type integer,msg)');

            if (values && values.length > 0) {
                tx.executeSql(tsql, values, function (tx, result) {
                    callback(null, result);
                });
            } else {
                tx.executeSql(tsql, [], function (tx, result) {
                    callback(null, result);
                });
            }
        }, function (tx, err) {
            console.log(tsql);
            callback(err);
        });
    }

    function _queryMessage(count, maxID, msgType, filter, callback) {
        var typeFilter = '';
        var maxFilter = '';
        var topFilter = '*';

        if (count && count > 0) {
            topFilter = ' TOP ' + count + ' * ';
        }

        if (msgType) {
            typeFilter = ' AND type = ' + msgType;
        }

        if (maxID && maxID > 0) {
            maxFilter = ' AND ID >= ' + (maxID + 1);
        }

        if (filter) {
            filter = ' AND ' + filter;
        }

        var tsql = 'SELECT ' + topFilter + ' FROM MESSAGE WHERE 1 = 1 ' + maxFilter + typeFilter + filter + ' ORDER BY sendTime ASC';
        db.execute(tsql, null, callback);
    }

    function _saveMessage(id, lineID, testroomcode, msgFull, sendTime, lineName, segmentName, companyName, testRoomName, isStore, type, msg, callback) {
        var sendTime = sendTime.toString().replace('T', ' ').replace('Z', ' ');
        db.execute('INSERT INTO MESSAGE (id, lineID, testroomcode, msgFull, sendTime, lineName, segmentName, companyName, testRoomName, isStore, type,msg) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            [id, lineID, testroomcode, msgFull, sendTime, lineName, segmentName, companyName, testRoomName, isStore, type, msg],
            callback);

    }

    function _saveOne(msg, callback) {
        var sendTime = msg.SendTime.toString().replace('T', ' ').replace('Z', ' ');

        return _saveMessage(
            msg.ID, msg.LineID, msg.TestRoomName, msg.MsgFull, sendTime, msg.LineName, msg.SegmentName, msg.CompanyName, msg.TestRoomName, 0, msg.MsgType, msg.Msg, callback);
    }

    function _modifyMessage(items, id, callback) {
        var keys = [],
            values = [],
            tsql = '';

        $.each(items, function (k, v) {
            keys.push(k + '=?');
            values.push(v);
        });

        tsql = 'UPDATE MESSAGE SET ' + keys.join(",") + ' WHERE id =' + id;

        db.execute(tsql, values, callback);
    }

    return {
        getMessageDatabaseInstance: _getMessageDatabaseInstance,
        execute: _execute,
        queryMessage: _queryMessage,
        saveMessage: _saveMessage,
        modifyMessage: _modifyMessage,
        saveOne: _saveOne
    }
}();

var loading = {
    show: function () {
        $.mobile.loading('show', {
            textVisible: false
        });
    },
    hide: function () {
        $.mobile.loading('hide');
    }
}

function unstore(id, ext, button) {
    var divID = '#' + ext + '_tip_' + id,
        aID = '#' + ext + '_a_' + id;

    db.modifyMessage({isStore: 0}, id, function (err) {
        if (err) {
            return console.log(err);
        }

        if (ext === 'store') {
            $(divID).hide('fast', function () {
                $(divID).remove();
            });
        }
        else {
            $(button).removeClass('ui-btn-active');
            $(button).attr('href', "javascript:store(" + id + ",'" + ext + "',this)");
        }
    });
}
var reportMaxMoth = 0;
function changeToReport(typeNum) {
    if (typeNum === 4) {
        $(reportListTitle).text("周报");
    }
    else {
        $(reportListTitle).text("月报");
    }

    $('#reportList').empty();
    db.queryMessage(null, 0, typeNum, 'lineID="' + currentLineID + '"', function (err, result) {
        if (err) {
            return console.log(err);
        }

        for (var i = 0; i < result.rows.length; i++) {
            if (reportMaxWeek < result.rows.item(i).id && typeNum === 4) {
                reportMaxWeek = result.rows.item(i).id;
            }
            if (reportMaxMoth < result.rows.item(i).id && typeNum === 5) {
                reportMaxMoth = result.rows.item(i).id;
            }
            var tempHtml = "<li> <a onclick='getReportDetail(" + result.rows.item(i).id + "," + typeNum + ")' href='#pageReportDetail' data-transition='slide' id='report-week' class=' ui-btn ui-btn-icon-right ui-icon-carat-r'>";
            var tempJson = eval("(" + result.rows.item(i).msgFull + ")");
            tempHtml = tempHtml + tempJson.reportTitle;
            tempHtml = tempHtml + "</a></li>";
            $('#reportList').prepend(tempHtml);
        }

        var tempMaxid = 0;
        if (typeNum === 4) {
            tempMaxid = reportMaxWeek;
        }
        else {
            tempMaxid = reportMaxMoth;
        }

        $.ajax({
            url: config.serviceURI + 'report/' + currentUser.userID + '/' + typeNum + '/' + tempMaxid + '/' + currentLineID,
            type: "GET",
            contentType: 'application/json',
            success: function (result) {

                $.each(result.msg, function (i, tempresult) {
                    try {

                        if (reportMaxWeek < tempresult.id && typeNum === 4) {
                            reportMaxWeek = tempresult.id;
                        }
                        if (reportMaxMoth < tempresult.id && typeNum === 5) {
                            reportMaxMoth = tempresult.id;
                        }

                        db.saveMessage(tempresult.ID, tempresult.LineID, tempresult.TestRoomName, tempresult.MsgFull, tempresult.SendTime, tempresult.LineName, tempresult.SegmentName, tempresult.CompanyName, tempresult.TestRoomName, 0, tempresult.MsgType, tempresult.Msg,
                            function (err, result) {
                                if (err) {
                                    return console.log(err);
                                }
                            });
                    }
                    catch (exception) {
                        return tip(exception);
                    }

                    var tempHtml = "<li > <a onclick='getReportDetail(" + tempresult.ID + "," + typeNum + ")' href='#pageReportDetail' data-transition='slide' id='report-week' class='ui-btn ui-btn-icon-right ui-icon-carat-r'>";
                    var tempJson = eval("(" + tempresult.MsgFull + ")");
                    tempHtml = tempHtml + tempJson.reportTitle;
                    tempHtml = tempHtml + "</a></li>";
                    $('#reportList').prepend(tempHtml);
                });
                $.mobile.loading("hide");
                $('#reportList').listview('refresh');
            },
            error: function (jqXHR, status, result) {
                tip('应用异常');
            }
        });
    });
}

function getReportDetail(msgid, typeNum) {
    $.mobile.loading("show", {
        textVisible: false});

    db.queryMessage(null, 0, typeNum, "id=" + msgid, function (err, result) {
        if (err) {
            return console.log(err);
        }
        var tempJson = eval("(" + result.rows.item(0).msgFull + ")");
        $('#reportDetailContent').empty();
        $('#reportDetailTitle').text(tempJson.reportTitle);
        $('#reportDetailContent').append(tempJson.reportContent);
        var html = '';
        $.each(tempJson.reportContent, function (i, tempresult) {
            tempresult.newInfoNum = tempresult.newInfoNum || 0;
            tempresult.infoUpdateNum = tempresult.infoUpdateNum || 0;
            tempresult.loginNum = tempresult.loginNum || 0;
            tempresult.mainValueUpdateNum = tempresult.mainValueUpdateNum || 0;
            tempresult.unqualifiedInfoNum = tempresult.unqualifiedInfoNum || 0;
            tempresult.untreatedUnqualifiedInfoNum = tempresult.untreatedUnqualifiedInfoNum || 0;

            html += '<li data-role="list-divider">' + tempresult.segmentName + ' ' + tempresult.companyName
            '</li>';
            html += '<li><span>新建资料</span><span class="ui-li-count">' + tempresult.newInfoNum + '份</span></li>';
            html += '<li><span>资料修改次</span><span class="ui-li-count">' + tempresult.infoUpdateNum + '份</span></li>';
            html += '<li><span>系统登录次</span><span class="ui-li-count">' + tempresult.loginNum + '份</span></li>';
            html += '<li><span>关键值修改</span><span class="ui-li-count">' + tempresult.mainValueUpdateNum + '份</span></li>';
            html += '<li><span>不合格资料</span><span class="ui-li-count">' + tempresult.unqualifiedInfoNum + '份</span></li>';
            html += '<li><span>未处理不合格资料</span><span class="ui-li-count">' + tempresult.untreatedUnqualifiedInfoNum + '份</span></li>';

        });
        $('#reportDetailContent').append(html);
        $('#reportDetailContent').listview('refresh');
        $.mobile.loading("hide");
    });


}

function initReportMsgNum(msgtype) {
    if (!currentUser || !currentLineID) {
        return;
    }

    var tempMaxid = 0;
    if (msgtype == 4) {
        tempMaxid = reportMaxWeek;
    }
    else {
        tempMaxid = reportMaxMoth;
    }

    $.ajax({
        url: config.serviceURI + 'report/' + currentUser.userID + '/' + msgtype + '/reportMsg/' + tempMaxid + '/' + currentLineID,
        type: "GET",
        contentType: 'application/json',
        success: function (result) {
            if (result) {
                if (msgtype == 4) {
                    app.setRestNumber(result[0].rest, "#mainReportWeek")
                }
                else {
                    app.setRestNumber(result[0].rest, "#menuReportOfMonth")
                }

            }
        },
        error: function (jqXHR, status, result) {
            //tip('应用异常');
        }
    });
}

function showTestRoom(code, codeType, title) {
    app.showTestRoom(code, codeType, title);
}

function call(tel) {
    try {
        window.open('tel:' + tel, '_system');
    } catch (e) {
        console.log(e);
    }
}

function showDetailsOfStatistics(code, codeType, title) {
    app.showDetailsOfStatistics(code, codeType, title);
}

function showState2(segmentCode, companyCode, companyName) {
    app.showState2(segmentCode, companyCode, companyName);
}

function callService() {
    call('02962763213');
}

function switchLine(lineID) {
    app.switchLine(lineID);
}

function skip(id, transaction) {
    var t = transaction || 'none';
    $.mobile.changePage(id, {transition: t, changeHash: false});
}