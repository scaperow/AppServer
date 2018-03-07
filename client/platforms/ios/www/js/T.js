var T = {
    unqualified: $("#unqualified").html(),
    keyModified: $("#keyModified").html(),
    buildUnqualified: function (lineName, location, time, content, onStore) {
        var result = T.unqualified;
        result = result.replace("#line", lineName).replace("#location", location).replace("#time", time).replace("#content", content).replace("#onStore", onStore);
        return result + "";
    },
    buildKeyModified: function (lineName, location, time, content, onStore) {
        var result = T.keyModified;
        result = result.replace("#line", lineName).replace("#location", location).replace("#time", time).replace("#content", content).replace("#onStore", onStore);
        return result + "";
    }
};

exports = T;