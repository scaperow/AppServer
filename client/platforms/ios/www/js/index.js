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
var app = function () {
    var serviceURI = 'http://app.kingrocket.com:9311/';
    var acceptNotification = true;
    //var serviceURI = 'http://localhost:3000/';
    var currentLineID;
    var databaseName = 'messageDatabase';
    var databaseVersion = '1.0';
    var databaseDisplayName = 'LISN message database';
    var testId = 101;

    Date.prototype.format = function (format) {
        /*   
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
        }

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
    }

    function syncUserProfile() {
        var basicToken = localStorage['basicToken'];

        if (basicToken) {
            $.mobile.loading("show", {
                textVisible: false
            });

            $.ajax({
                url: serviceURI + 'user/' + localStorage['userID'],
                type: "GET",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + basicToken);
                },
                success: function (userProfile) {
                    if (userProfile) {
                        initializeAppForUser(userProfile)
                    }

                    $.mobile.loading("hide");
                },
                error: function (jqXHR, status) {
                    alert(status);
                }
            });
        } else {
            $(":mobile-pagecontainer").pagecontainer("change", "#loginPage");
        }
    }

    function initializeAppForUser(userProfile) {
        if (acceptNotification && userProfile.tags && userProfile.tags.length > 0) {
            window.plugins.jPushPlugin.setTagsWithAlias(userProfile.tags, userProfile.userID);
        }

        initializeLinePanel(userProfile);

        if (userProfile.lastLine) {
            var lineKey = 'line-' + userProfile.lastLine.ID;
            localStorage[lineKey] = JSON.stringify(userProfile.lastLine);
            loadLine(userProfile.lastLine);
        }
    }

    function lineItemClick(event) {
        if (event && event.target && event.target.tagName == "LI") {
            var el = $(event.target);
            var lineID = el.attr('data-id');
            var lineName = el.text();
            var basicToken = localStorage['basicToken'];
            var lineKey;

            $.ajax({
                url: serviceURI + 'switch/' + localStorage['userID'] + '/' + localStorage['userName'] + '/' + lineID,
                type: "get",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + basicToken);
                },
                success: function (lineInfo) {
                    lineKey = 'line-' + lineInfo.ID;
                    localStorage[lineKey] = JSON.stringify(lineInfo);
                    loadLine(lineInfo);
                },
                error: function (jqXHR, status) {
                    lineKey = 'line-' + lineID;
                    var lineInfoJson = localStorage[lineKey]
                    if (lineInfoJson) {
                        var lineInfo = JSON.parse(lineInfoJson);
                        if (lineInfo) {
                            loadLine(lineInfo);
                        }
                    }
                }
            });

            $("#line-panel").panel("close");
        }
    }

    function initializeLinePanel(userProfile) {
        $('#line-list').unbind('click', lineItemClick);
        //remove the old list content
        $('#line-panel').html();
        var lineItemHtmls = ['<ul data-role="listview" id="line-list">'];

        //add the new list content
        if (userProfile.lines && userProfile.lines.length > 0) {
            for (var i = 0; i < userProfile.lines.length; i++) {
                lineItemHtmls.push('<li data-id="' + userProfile.lines[i].ID + '">' + userProfile.lines[i].name + '</li>');
            }
        }

        if (userProfile.lines.length <= 1) {
            $("a[role='switchLineTag']").hide();
        }

        lineItemHtmls.push("</ul>");
        $('#line-panel').html(lineItemHtmls.join('\r\n'));
        $('#line-list').bind('click', lineItemClick);
        $('#line-list').listview();
    }

    function loadLine(line) {
        var html = '',
            segment,
            i, j,
            testRoom;

        currentLineID = line.ID;

        $('.lineName').text(line.name);
        //$('#main-content').html();
        if (line && line.segments && line.segments.length > 0) {
            html += '<div data-role="collapsibleset" data-inset="false" data-content-theme="b">'
            for (i = 0; i < line.segments.length; i++) {
                segment = line.segments[i];
                html += '<div data-role="collapsible" data-inset="false" data-collapsed-icon="carat-d" data-expanded-icon="carat-u" data-iconpos="right">';
                html += '<h3>' + segment.name + '</h3>';
                html += '<ul data-role="listview">';
                for (j = 0; j < segment.testRooms.length; j++) {
                    testRoom = segment.testRooms[j];
                    html += '<li><a data-iconpos="right" data-icon="carat-r" href="#" data-roomid="' + testRoom.code + '">' + testRoom.name + '</a></li>';
                }
                html += '</ul></div>';
            }

            html += '</div>';
        }
        $('#main-content').html(html);

        $("#main-content [data-role='listview']").listview();
        $("#main-content [data-role='collapsible']").collapsible();
        $("#main-content [data-role='collapsibleset']").collapsibleset();
        $(":mobile-pagecontainer").pagecontainer("change", "#pContent");
    }

    function onTagsWithAlias() {
        var result = "result code:" + event.resultCode + " ";
        result += "tags:" + event.tags + " ";
        result += "alias:" + event.alias + " ";
    }

    function getMaxMessageID(callback) {
        callback(null, 30);
        return;
        var db = getMessageDatabaseInstance();
        db.transaction(function (tx) {
            tx.executeSql(
                'SELECT TOP 1 id  from MESSAGE ORDER BY sendTime DESC',
                [],
                function (tx, result) {
                    if (result && result.rows.length > 0) {
                        callback(null, result.rows.item(0).id);
                    }
                }
            );
        }, function (tx, err) {
            callback('本地数据库异常');
        });
    }

    function getMessageDatabaseInstance() {
        return openDatabase(databaseName, databaseVersion, databaseDisplayName, 20 * 1024 * 1024);
    }

    function renderMessagesOfTestRoom(testroomCode) {
        var db = getMessageDatabaseInstance();
        db.transaction(function (tx) {
            tx.executeSql(
                'select message,sendTime from MESSAGE where testroomcode = ?',
                [testroomCode],
                function (tx, result) {
                    var messagesHtml = '';
                    if (result && result.rows.length > 0) {
                        for (var i = 0; i < result.rows.length; i++) {
                            var message = result.rows.item(i).message;
                            var sendTime = result.rows.item(i).sendTime;
                            messagesHtml += '<div>' + (new Date(sendTime)).format("yyyy-MM-dd hh:mm:ss") + '</div>';
                            messagesHtml += '<div class="message-box">' + message + '</div>';
                        }
                    }

                    $('#message-list-content').html(messagesHtml);
                    $.mobile.loading("hide");
                }
            );
        }, function (tx, error) {
            $.mobile.loading("hide");
        });
    }

    function renderMessages() {
        try {
            var db = getMessageDatabaseInstance();
            db.transaction(function (tx) {
                tx.executeSql(
                    'select * from MESSAGE',
                    [],
                    function (tx, result) {
                        var messagesHtml = '';
                        if (result && result.rows.length > 0) {
                            for (var i = 0; i < result.rows.length; i++) {
                                var r = result.rows.item(i);
                                messagesHtml += T.buildUnqualified(r.lineName
                                    , r.segmentName + ' ' + r.companyName + ' ' + r.testRoomName
                                    , new Date(r.sendTime).format('yyyy-MM-dd hh:mm:ss')
                                    , r.message, "store()");
                            }
                        }

                        $('#message-list-content').html(messagesHtml);
                        $.mobile.loading("hide");
                    }
                );
            }, function (tx, error) {
                $.mobile.loading("hide");
            });
        } catch (exception) {
            alert(exception);
        }
    }

    function initializeUI() {
        $('#lines').click(function (e) {
            $.mobile.changePage('lines.html', {
                changeHash: true,
                dataUrl: "lines",    //the url fragment that will be displayed for the test.html page
                transition: "slide"  //if not specified used the default one or the one defined in the default settings
            });
        });

        $('#loadButton').click(function (e) {
            renderMessages();
            getMaxMessageID(function (err, id) {
                if (err) {
                    return alert(err);
                }

                alert("maxid:" + id);

                $.ajax({
                    url: serviceURI + 'msg/' + localStorage['userID'] + '/' + id + '/1',
                    type: "GET",
                    contentType: 'application/json',
                    success: function (result) {
                        if (result) {
                            var rest = result.rest;
                            var msgs = result.msgs;


                            _.each(msgs, function (msg) {
                                _saveMessage(msg.ID + '', msg.LineID + '', msg.TestRoomCode + '', msg.Msg + '', msg.SendTime + '', msg.LineName + '', msg.SegmentName + '', msg.CompanyName + '', msg.TestRoomName + '', 0 + '', msg.MsgType + '', function () {
                                }, function (err) {
                                    alert(msg.ID + "-" + err.code);
                                });
                            });
                        } else {
                            alert('没有获取到更多的数据');
                        }
                    },
                    error: function (jqXHR, status) {
                        alert(status);
                    }
                });
            });
        });

        $('#loginButton').click(function (e) {
            var data = {
                userName: $('#name').val(),
                password: $('#password').val()
            };

            $.ajax({
                url: serviceURI + 'login',
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function (userProfile) {
                    localStorage['userName'] = data.userName;
                    localStorage['password'] = data.password;
                    localStorage['userID'] = userProfile.userID;
                    console.log(btoa(userProfile.userID + ':' + userProfile.password));
                    localStorage['basicToken'] = btoa(userProfile.userID + ':' + data.password);

                    if (userProfile) {
                        initializeAppForUser(userProfile);

                    }

                    $(":mobile-pagecontainer").pagecontainer("change", "#pContent");
                    //$("#list-message").click();
                },
                error: function (jqXHR, status) {
                    alert(status);
                }
            });
        });

        $('#main-content').click(function (e) {
            if (e && e.target && e.target.tagName == "A") {
                var testRoomCode = $(e.target).attr('data-roomid');
                if (testRoomCode) {
                    $('#message-list-content').html();
                    $(":mobile-pagecontainer").pagecontainer("change", "#message-list-page");
                    $.mobile.loading("show", {
                        textVisible: false
                    });
                    renderMessagesOfTestRoom(testRoomCode);
                }
            }
        });

        $('#settings').click(function (e) {
//            _saveMessage(
//                2,
//                '123',
//                '0001000100010001',
//                'alert message', 'hello world!',
//                (new Date()).getTime(),
//                '',
//                function (tx, resultSet) {
//                    console.log('saveMessage success!');
//                },
//                function (tx, error) {
//                    console.log('saveMessage failed!')
//                }
//            );
            testId += 1;
            if (e && e.target) {
                $('#message-list-content').html();
                $(":mobile-pagecontainer").pagecontainer("change", "#message-list-page");
                $.mobile.loading("show", {
                    textVisible: false
                });
                renderMessages();

            }
        });

        $("#passwordButton").click(function (e) {
            $.ajax({
                url: serviceURI + $('#name').val(),
                type: "GET",
                success: function (result) {
                    $('#passwordButton').disable(false);
                    var count = 60;
                    var loop = function () {
                        $('#passwordButton').text(--count + ' 秒后重新获取密码');
                        if (count <= 0) {
                            $('#passwordButton').disable(true);
                        } else {
                            setTimeout(loop, 1000);
                        }
                    }
                },
                error: function (jqXHR, status) {
                    alert(status);
                }
            });
        });
    }


    function _saveMessage(id, lineID, testroomcode, message, sendTime, lineName, segmentName, companyName, testRoomName, isStore, type, successCallback, errorCallback) {
        var db = getMessageDatabaseInstance();
        db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS MESSAGE (id unique, lineID, testroomcode,message,sendTime,lineName, segmentName, companyName, testRoomName, isStore, type)');
            tx.executeSql('INSERT INTO MESSAGE (id, lineID, testroomcode, message, sendTime, lineName, segmentName, companyName, testRoomName, isStore, type) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [id, lineID, testroomcode, message, sendTime, lineName, segmentName, companyName, testRoomName, isStore, type]);
        }, errorCallback, successCallback);
    }

    return {
        // Application Constructor
        initialize: function () {
            initializeUI();
            this.bindEvents();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
            //window.plugins.jPushPlugin.receiveMessageIniOSCallback = fonReceiveMessage;
            //document.addEventListener("jpush.setTagsWithAlias", onTagsWithAlias, false);
        },
        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function () {
            app.receivedEvent('deviceready');
            syncUserProfile();
        },
        // Update DOM on a Received Event
        receivedEvent: function (id) {
            console.log('Received Event: ' + id);
        },
        saveMessage: _saveMessage,
        showiOSMessage: function (data) {
            alert(data);
        }
    };
}();
