'use strict';

var noCallback = function(){};

/**
 * Creates a websocket to send messages between the server and the user
 *
 * @param token Token channel
 * @param onMessageReception
 * @param endpoint
 */
function MessagesChannel(token, endpoint) {
    var wsEndpoint = (endpoint || ("ws://" + location.host)) + "/messages";
    var socket = new WebSocket(wsEndpoint, "protocolOne");

    socket.onopen = function(event) {
        var data = {
            "type": "authenticate",
            "data": token
        };
        socket.send(JSON.stringify(data))
    };

    var createOnMessageEvent = function(callback) {
        var onMessageCallback = callback || noCallback;

        return function(event) {
            switch(event.type) {
                case "message":
                    onMessageCallback(event.data);
                    break;
                default:
                    console.warn("Unhandled message from server.");
                    console.log(event);
            }
        }
    };

    var changeUser = function(to_user) {
        var data = {
            "type": "user",
            "data": to_user
        };

        socket.send(JSON.stringify(data));
    };

    return {
        /**
         * @param {string} message
         */
        send: function(message) {
            var data = {
                "type": "message",
                "token": token,
                "message": message
            };

            socket.send(JSON.stringify(data));
        },

        /**
         * @param {string} to_user
         * @param {function} onMessageReception
         */
        switchUser: function(to_user, onMessageReception) {
            changeUser(to_user);
            socket.onmessage = createOnMessageEvent(onMessageReception);
        },

        close: function() {
            socket.close();
        }
    }
}

function Server(endpoint) {

    endpoint = (endpoint || (location.protocol + location.host));

    function isStatusValid(status) {
        return status >= 200 && status < 400;
    }

    function defaultReadyStateCall(xhr, onSuccess, onError) {
        if (!(xhr instanceof XMLHttpRequest)) { return; }
        var successCallback = onSuccess || noCallback;
        var errorCallback = onError || noCallback;

        return function() {
            if (xhr.readyState != XMLHttpRequest.DONE) { return; }
            isStatusValid(xhr.status) ? successCallback() : errorCallback();
        }
    }

    return {
        signIn: function(email, password, onSuccess, onError) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/login", true, email, password);

            xhr.onreadystatechange = defaultReadyStateCall(xhr, onSuccess, onError);
            xhr.send();
        },

        signOut: function(token, onSuccess, onError) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/logout", true);
            xhr.setRequestHeader("X-Session-Token", token);

            xhr.onreadystatechange = defaultReadyStateCall(xhr, onSuccess, onError);
            xhr.send();
        },

        signUp: function(data, onSuccess, onError) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint + "/register", true);
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.onreadystatechange = defaultReadyStateCall(xhr, onSuccess, onError);
            xhr.send(JSON.stringify(data))
        }
    }
}