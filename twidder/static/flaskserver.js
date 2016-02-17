'use strict';

var noCallback = function(){};

/**
 * A promise object to wrap an XMLHttpRequest
 * @param {XMLHttpRequest} xhr
 * @param {string} [content]
 */
function XhrSender(xhr, content) {

    var onSuccessCallback = noCallback,
        onErrorCallback = noCallback;

    function isStatusValid(status) {
        return status >= 200 && status < 400;
    }

    function runPromise(success, error) {

        xhr.onreadystatechange = function () {
            if (xhr.readyState != XMLHttpRequest.DONE) {
                return;
            }

            isStatusValid(xhr.status) ?
                onSuccessCallback(xhr.response) :
                onErrorCallback(xhr.response);
        };

        content ? xhr.send(content) : xhr.send();
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

        send: function() {
            runPromise(onSuccessCallback, onErrorCallback);
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
    var socket = new WebSocket(wsEndpoint, "protocolOne");

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

    endpoint = (endpoint || (location.protocol + location.host));

    function encodeJsonXhr(xhr, data) {
        xhr.setRequestHeader("Content-Type", "application/json");
        return JSON.stringify(data);
    }

    return {
        signIn: function(email, password) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/login", true, email, password);

            return new XhrSender(xhr);
        },

        signOut: function(token) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/logout", true);
            xhr.setRequestHeader("X-Session-Token", token);

            return new XhrSender(xhr);
        },

        signUp: function(data) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/register", true);
            encodeJsonXhr(xhr, data);

            return new XhrSender(xhr);
        },

        getUserMessagesByToken: function(token) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/messages", true);
            xhr.setRequestHeader("X-Session-Token", token);

            return new XhrSender(xhr);
        },

        getUserMessagesByEmail: function(token, email) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/messages/" + email, true);
            xhr.setRequestHeader("X-Session-Token", token);

            return new XhrSender(xhr);
        },

        postMessage: function(token, content, toEmail) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/messages/" + toEmail, true);
            xhr.setRequestHeader("X-Session-Token", token);

            var data = {
                "message": content
            };
            encodeJsonXhr(xhr, data);

            return new XhrSender(xhr);
        },

        getUserDataByToken: function(token) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/profile", true);
            xhr.setRequestHeader("X-Session-Token", token);

            return XhrSender(xhr);
        },

        getUserDataByEmail: function(token, email) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", endpoint + "/profile/" + email, true);
            xhr.setRequestHeader("X-Session-Token", token);

            return XhrSender(xhr);
        },

        changePassword: function(token, oldPassword, newPassword) {
            var xhr = new XMLHttpRequest();
            xhr.open("PUT", endpoint + "/changePassword", true);
            xhr.setRequestHeader("X-Session-Token", token);

            var data = {
                "oldPassword": oldPassword,
                "newPassword": newPassword
            };
            encodeJsonXhr(xhr, data);

            return new XhrSender(xhr);
        }
    }
}