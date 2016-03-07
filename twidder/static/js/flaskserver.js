'use strict';

/**
 * A promise object to wrap an XMLHttpRequest
 * @param {XMLHttpRequest} xhr
 * @param {string} [content]
 * @param {string} [sessionToken]
 */
function XhrSender(xhr, content, sessionToken) {

    var onSuccessCallback = noCallback,
        onErrorCallback = noCallback;

    var isText = false;

    function isStatusValid(status) {
        return status >= 200 && status < 400;
    }

    function appendHmac() {
        var currentTimestamp = Date.now() / 1e3 | 0;

        var hmac = new sjcl.misc.hmac(CLIENT_SECRET);
        hmac.update(currentTimestamp + "");
        hmac.update(sessionToken || "");
        hmac.update(content || "");

        var hexHmac = sjcl.codec.hex.fromBits(hmac.digest());
        xhr.setRequestHeader("X-Request-Hmac", btoa(hexHmac));
        xhr.setRequestHeader("X-Request-Timestamp", currentTimestamp + "");

        if (sessionToken) {
            xhr.setRequestHeader("X-Session-Token", sessionToken)
        }
    }

    function runXhr() {
        appendHmac();

        xhr.onreadystatechange = function () {
            if (xhr.readyState != XMLHttpRequest.DONE) {
                return;
            }

            var response = isText ? xhr.response : JSON.parse(xhr.response);
            isStatusValid(xhr.status) ?
                onSuccessCallback(response) :
                onErrorCallback(response);
        };

        xhr.send(content || "")
    }

    return {
        /**
         * @param {function} callback
         */
        onSuccess: function(callback) {
            if (callback) {
                onSuccessCallback = callback;
            }
            return this;
        },

        /**
         * @param {function} callback
         */
        onError: function(callback) {
            if (callback) {
                onErrorCallback = callback;
            }
            return this;
        },

        asText: function() {
            isText = true;
            return this;
        },

        send: function() {
            runXhr();
        }
    }

}

/**
 * @param {string} sessionToken
 * @param {function} onClose
 * @param {string} [endpoint]
 */
function WebsocketChannel(sessionToken, onClose, endpoint) {
    var onCloseCallback = onClose || noCallback;

    var wsEndpoint = (endpoint || ("ws://" + location.host)) + "/messages";
    var socket = new WebSocket(wsEndpoint);

    socket.onopen = function() {
        var data = {
            "type": "authenticate",
            "data": sessionToken
        };
        socket.send(JSON.stringify(data));
    };

    socket.onclose = function(event) {
        onCloseCallback();
    };

    return {
        close: function() {
            socket.close();
        }
    }
}

function Server(endpoint) {

    endpoint = (endpoint || (location.protocol + "//" + location.host + "/api"));

    function encodeJsonXhr(xhr, data) {
        xhr.setRequestHeader("Content-Type", "application/json");
        return JSON.stringify(data);
    }

    return {
        signIn: function(email, password) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/login", true);
            xhr.setRequestHeader("Authorization", "Basic " + btoa(email + ":" + password));

            return new XhrSender(xhr);
        },

        signOut: function(token) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/logout", true);
            return new XhrSender(xhr, "", token);
        },

        signUp: function(data) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/register", true);
            var content = encodeJsonXhr(xhr, data);

            return new XhrSender(xhr, content);
        },

        getUserMessagesByToken: function(token) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/messages", true);
            return new XhrSender(xhr, "", token);
        },

        getUserMessagesByEmail: function(token, email) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/messages/" + email, true);
            return new XhrSender(xhr, "", token);
        },

        postMessage: function(token, message, media, toEmail) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/messages/" + toEmail, true);

            var data = new FormData();
            data.append("message", message);
            data.append("media", media);

            return new XhrSender(xhr, data, token);
        },

        getUserDataByToken: function(token) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/profile", true);
            return XhrSender(xhr, "", token);
        },

        getUserDataByEmail: function(token, email) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/profile/" + email, true);
            return XhrSender(xhr, "", token);
        },

        changePassword: function(token, oldPassword, newPassword) {
            var xhr = new XMLHttpRequest();
            xhr.open("PUT", endpoint + "/changePassword", true);

            var data = {
                "oldPassword": oldPassword,
                "newPassword": newPassword
            };
            var content = encodeJsonXhr(xhr, data);

            return new XhrSender(xhr, content, token);
        }
    }
}