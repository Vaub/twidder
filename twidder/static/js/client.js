'use strict';

var chart;

var messages;

var server;
var session;
var signedInView;
var welcomeView;

var templates;

var twidder;

// Creates messages (alerts) for the website no matter the view
function Messages(messageTimeout) {

    var messageBox = document.getElementById("message_box");

    function closeMessage(message) {
        if (messageBox.contains(message)) {
            messageBox.removeChild(message);
        }
    }

    function closeMessageTimeout(message, timeBeforeClose) {
        setTimeout(function () {
            closeMessage(message)
        }, timeBeforeClose);
    }

    function createNewMessage(text) {
        var template = templates.use("message", { text: text });
        var element = Utils.createElement(template, "message");
        Utils.addClass(element, "hidden");

        var closeNode = element.getElementsByClassName("message_close")[0];

        messageBox.appendChild(element);
        closeNode.onclick = function () {
            closeMessage(element)
        };

        return element;
    }

    return {
        newMessage: function (messageText, styleClass) {
            var message = createNewMessage(messageText);

            Utils.addClass(message, styleClass);
            closeMessageTimeout(message, messageTimeout);
            Utils.removeClass(message, "hidden");
        },

        newError: function (text) {
            this.newMessage(text, "message_error")
        },

        newSuccess: function (text) {
            this.newMessage(text, "message_success")
        },

        newStatusMessage: function(text, success){
            if(success){
                this.newSuccess(text);
            }
            else{
                this.newError(text);
            }
        }
    }
}

function Wall(getProfileFunction, getMessagesFunction, postMessageFunction) {

    var posts = [];
    var profile;

    var wallNode = Utils.createElement("", "wall_container");

    var videoFormats = {"mp4": "mp4"};
    var audioFormats = {"mp3": "mpeg", "wav": "wav"};
    var imageFormats = ["jpg", "png"];

    function createPosts(data) {
        return data.map(function(post) {
            var newPost = post;
            if (post.media) {
                var ext = post.media.substr(post.media.lastIndexOf(".") + 1);

                newPost.format = ext;
                if (videoFormats[ext]) {
                    newPost.video = post.media;
                    newPost.format = videoFormats[ext];
                }
                else if (audioFormats[ext]) {
                    newPost.audio = post.media;
                    newPost.format = audioFormats[ext];
                }
                else if (imageFormats.lastIndexOf(ext) != -1) {
                    newPost.image = post.media;
                }
            }

            return newPost
        });
    }

    function refreshView() {
        wallNode.innerHTML = templates.use("wall", { posts: posts, profile: profile });
        createHandlers();
    }

    function refreshWall() {
        getMessagesFunction(
            function(response) {
                posts = createPosts(response.data);
                refreshView();
            },
            function(response) {
                messages.newError(response.message);
            }
        );
    }

    function postMessage(message, media) {
        postMessageFunction(
            message,
            media,
            function(response) {
                refreshWall();
            },
            function(response) {
               messages.newError(response.message);
            }
        );
    }

    function createHandlers() {
        var postForm = wallNode.getElementsByClassName("wall_post_message")[0];
        var refreshButton = wallNode.getElementsByClassName("wall_refresh")[0];

        postForm.onsubmit = function() {
            var message = postForm.elements["message"],
                media = postForm.elements["media"];

            if (message.value || media.files[0]) {
                postMessage(message.value, media.files[0]);
                message.value = "";
            }

            return false;
        };

        refreshButton.onclick = function() {
            refreshWall();
            return false;
        };
    }

    function init() {
        var messagesResponse = getMessagesFunction(function(response) {
            posts = createPosts(response.data || []);
            refreshView();
        });
        var profileResponse = getProfileFunction(function(response) {
            profile = response.data;
            refreshView();
        }, function(response){
            messages.newError("User does not exists.");
        });
    }

    init();

    return {
        refreshWall: refreshWall,
        element: wallNode
    }

}

// SignedInView state
function SignedInView(session) {

    var template = templates.use("login");

    function displayTab(name){
        var tabs = [].slice.call(document.getElementsByClassName("menu_tab"));

        tabs.forEach(function(tab) {
            var toDisplayId = tab.getAttribute("rel");
            var element = document.getElementById(toDisplayId);

            if (toDisplayId !== name) {
                Utils.removeClass(tab, "selected");
                Utils.addClass(element, "hidden");
                return;
            }

            Utils.addClass(tab, "selected");
            Utils.removeClass(element, "hidden");
        });
    }

    function createAccountTabEvents() {
        var changePasswordForm = document.getElementById("change_password");
        var signOut = document.getElementById("sign_out");

        var passwordChangedCallback = function(message, isSuccess) {
            changePasswordForm.oldPassword.value = "";
            changePasswordForm.newPassword.value = "";
            messages.newStatusMessage(message, isSuccess);
        };

        changePasswordForm.onsubmit = function () {
            var oldPassword = changePasswordForm.oldPassword.value;
            var newPassword = changePasswordForm.newPassword.value;

            if(Utils.isPasswordLengthValid(newPassword)) {

                session.changePassword(oldPassword, newPassword,
                    function(response) {
                        passwordChangedCallback(response.message, true);
                    },
                    function(response) {
                        passwordChangedCallback(response.message, false);
                    });

            } else {
                messages.newError("Password is empty or too short, try again!");
            }

            return false;
        };

        signOut.onclick = function(){
            session.signOut();
        }
    }

    function createHomeTab() {
        var homeViewContainer = document.getElementById("home_view_container");

        var getHomeProfile = function(s, e) { session.getCurrentUserData(s, e); };
        var getHomeMessages = function(s, e) { session.getCurrentUserMessages(s, e); };
        var postHomeMessage = function(message, media, s, e) { session.postMessageOnWall(message, media, s, e) };

        var homeWall = new Wall(getHomeProfile, getHomeMessages, postHomeMessage);
        Utils.removeAllChild(homeViewContainer);
        homeViewContainer.appendChild(homeWall.element);
    }

    function createBrowseTab() {
        var searchForm = document.getElementById("search_form");
        searchForm.onsubmit = function(){
            page("/browse/" + searchForm.otherUsername.value);
            return false;
        };
    }

    function displayUser(email) {
        var browseViewContainer = document.getElementById("browse_view_container");

        var getBrowseProfile = function(s, e) { session.getOtherUserDataByEmail(email, s, e); };
        var getBrowseMessages = function(s, e) { session.getOtherUserMessagesByEmail(email, s, e); };
        var postBrowseMessage = function(message, media, s, e) { session.postMessage(message, media, email, s, e); };

        var browseWall = new Wall(getBrowseProfile, getBrowseMessages, postBrowseMessage);
        Utils.removeAllChild(browseViewContainer);
        browseViewContainer.appendChild(browseWall.element);

        return false;
    }

    function createChart(){
        var chartViewContainer = document.getElementById("chart_view_container");
        chart = new DonutChart(chartViewContainer);
    }

    function initializeView() {
        createAccountTabEvents();
        createHomeTab();
        createBrowseTab();
        createChart();
    }

    return {
        displayView: function () {
            document.getElementById("current_view").innerHTML = template;

            initializeView();
        },

        displayHome: function() {
            displayTab("home");
        },

        displayUser: function(email) {
            displayTab("browse");
            if (email) {
                displayUser(email);
            }
        },

        displayAccount: function() {
            displayTab("account");
        },

        name: function() {
            return "signedInView";
        }
    }
}

// WelcomeView state
function WelcomeView(session) {

    function validateLoginForm(form) {
        var password = form.user_password;

        if (password && Utils.isPasswordLengthValid(password.value)) {
            Utils.removeClass(password, "invalid_input");
        } else {
            Utils.addClass(password, "invalid_input");
            messages.newError("Password is empty or too short, try again!");

            return false;
        }

        return true;
    }

    function validateSignupFormData(form) {

        // password
        var password = form.password;
        var repeatPassword = form.repeat_password;
        if (password.value && Utils.isPasswordLengthValid(password.value) && (password.value === repeatPassword.value)) {
            Utils.removeClass(password, "invalid_input");
            Utils.removeClass(repeatPassword, "invalid_input");
        } else {
            Utils.addClass(password, "invalid_input");
            Utils.addClass(repeatPassword, "invalid_input");
            messages.newError("Password input is invalid, be sure to have a valid (more than " +
                minPasswordLength + " characters) and that both field are the same!");

            return false;
        }

        return true;
    }

    function addEvents() {
        var login = document.getElementById("login");
        var signup = document.getElementById("signup");

        login.onsubmit = function () {
            if (validateLoginForm(login)) {
                var userEmail = login.user_email;
                var userPassword = login.user_password;

                session.signIn(userEmail.value, userPassword.value);
            }

            return false;
        };

        signup.onsubmit = function () {
            if (validateSignupFormData(signup)) {

                var signUpForm = {
                    email: signup.username.value,
                    password: signup.password.value,
                    first_name: signup.first_name.value,
                    family_name: signup.family_name.value,
                    gender: signup.gender.value,
                    city: signup.city.value,
                    country: signup.country.value
                };

                session.signUp(signUpForm);
            }

            return false;
        };
    }

    return {
        displayView: function () {
            document.getElementById("current_view").innerHTML = templates.use("welcome");
            addEvents();
        },

        name: function() {
            return "welcomeView";
        }
    };
}

/**
 * @param server
 * @param {function} notifySessionChange
 */
function Session(server, notifySessionChange) {
    var TOKEN = "sessionToken";

    var sessionToken = localStorage.getItem(TOKEN);
    var channel;

    if (sessionToken) {
        createChannel();
    }

    function createChannel() {
        channel = new WebsocketChannel(sessionToken, function() {
            signOutFromServer();
        }, function(statistics){
            chart.update(statistics);
        });
    }

    function changeToken(token) {
        localStorage.setItem(TOKEN, token);
        sessionToken = token;
    }

    function signOutFromServer() {
        server
            .signOut(sessionToken)
            .onSuccess(notifySessionChange)
            .onError(notifySessionChange)
            .send();
    }

    return {
        signUp: function (userForm) {
            var that = this;

            var loginSuccess = function(response) {
                that.signIn(userForm.email, userForm.password);
                messages.newSuccess(response.message);
            };
            var loginError = function(response) { messages.newError(response.message) };

            server
                .signUp(userForm)
                .onSuccess(loginSuccess)
                .onError(loginError)
                .send();
        },

        signIn: function (username, password, onSuccess, onError) {
            var successCallback = onSuccess || noCallback;
            var errorCallback = onError || noCallback;
            var that = this;

            var signInSuccess = function(response) {
                changeToken(response.data);
                createChannel();

                notifySessionChange();
                successCallback(response);
            };

            var signInError = function(response) {
                messages.newError(response.message);
                errorCallback(response);
            };

            server
                .signIn(username, password)
                .onSuccess(signInSuccess)
                .onError(signInError)
                .send();
        },

        isSignedIn: function(signedInCallback, notSignedInCallback) {
            var successCallback = function() { ( signedInCallback || noCallback )(); };
            var errorCallback = function() { ( notSignedInCallback || noCallback )(); };

            server.getUserDataByToken(sessionToken)
                .onSuccess(signedInCallback)
                .onError(notSignedInCallback)
                .send();
        },

        signOut: function () {
            if (channel) {
                channel.close();
            }
            signOutFromServer();
        },

        changePassword: function (oldPassword, newPassword, onSuccess, onError) {
            server
                .changePassword(sessionToken, oldPassword, newPassword)
                .onSuccess(onSuccess || noCallback)
                .onError(onError || noCallback)
                .send();
        },

        getCurrentUserData: function(onSuccess, onError) {
            server
                .getUserDataByToken(sessionToken)
                .onSuccess(onSuccess || noCallback)
                .onError(onError || noCallback)
                .send();
        },

        getCurrentUserMessages: function (onSuccess, onError) {
            server
                .getUserMessagesByToken(sessionToken)
                .onSuccess(onSuccess || noCallback)
                .onError(onError || noCallback)
                .send();
        },

        postMessage: function(message, media, toEmail, onSuccess, onError) {
            server
                .postMessage(sessionToken, message, media, toEmail)
                .onSuccess(onSuccess)
                .onError(onError)
                .send();
        },

        postMessageOnWall: function(message, media, onSuccess, onError) {
            var that = this;

            this.getCurrentUserData(
                function(response) {
                    that.postMessage(message, media, response.data.email, onSuccess, onError);
                },
                function(response) {
                    onError(response);
                }
            );
        },

        getOtherUserDataByEmail: function(email, onSuccess, onError){
            server
                .getUserDataByEmail(sessionToken, email)
                .onSuccess(onSuccess)
                .onError(onError)
                .send();
        },

        getOtherUserMessagesByEmail: function(email, onSuccess, onError){
            server
                .getUserMessagesByEmail(sessionToken, email)
                .onSuccess(onSuccess)
                .onError(onError)
                .send();
        }
    }
}

// Main "refresh" of the website
var displayView = function () {
    page("/");
};

var initApp = function() {
    var messagesDefaultTimeout = 5000;
    messages = new Messages(messagesDefaultTimeout);

    server = new Server();
    session = new Session(server, displayView);
    signedInView = new SignedInView(session);
    welcomeView = new WelcomeView(session);

    twidder = new Twidder(session, welcomeView, signedInView);
    twidder.start();
};

// "App" constructor
window.onload = function () {
    templates = new Templates();
    templates
        .add("welcome")
        .add("login")
        .add("wall")
        .add("message")
        .compile(function() {
            initApp();
        });
};