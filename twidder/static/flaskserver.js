'use strict';

var noCallback = function(){};

function MessagesChannel(endpoint, onMessageReception) {

    var socket = new WebSocket(endpoint, "protocolOne");

    socket.onmessage = function(event) {
        var onMessageCallback = onMessageReception || noCallback;
        switch(event.type) {
            case "message":
                onMessageCallback(event.data);
                break;
            default:
                console.error("Unknown message from server.");
                console.error(event);
        }
    };

    return {
        send: function(to_user, message) {
            var data = {
                "type": "message",
                "to_user": to_user,
                "message": message
            };

            socket.send(JSON.stringify(data));
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