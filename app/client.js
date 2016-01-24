'use strict';

var messages;

var session;
var signedInView;
var welcomeView;

var ViewUtils = {
    isElementAView: function (element) {
        return (element instanceof HTMLElement) &&
            (element.getAttribute("type") === "text/view");
    },

    displayViewFromId: function (toDisplayId, viewContainerId) {
        var view = document.getElementById(viewContainerId);
        var viewToDisplay = document.getElementById(toDisplayId);

        if (!this.isElementAView(viewToDisplay)) {
            return false;
        }

        view.innerHTML = viewToDisplay.innerHTML;
    },

    createElementFromView: function(viewId, withClass) {
        var view = document.getElementById(viewId);
        var element = document.createElement("div");

        element.innerHTML = view.innerHTML;
        if (withClass && typeof(withClass) === "string") {
            Utils.addClass(element, withClass);
        }

        return element;
    }
};

// Various utilities methods
var Utils = {
    // Add a class to an HTMLElement
    addClass: function (element, classToAdd) {
        if (!(element instanceof HTMLElement) || element.classList.contains(classToAdd)) {
            return false;
        }
        element.classList.add(classToAdd);
    },

    // Remove a class from an HTMLElement
    removeClass: function (element, classToRemove) {
        if (!(element instanceof HTMLElement) || !element.classList.contains(classToRemove)) {
            return false;
        }
        element.classList.remove(classToRemove);
    },

    removeAllChilds: function(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
};

function Messages(messageTimeout) {

    var messageBox = document.getElementById("message_box");
    var messageView = document.getElementById("message_view");

    var messageDOM = document.createElement("div");
    messageDOM.innerHTML = messageView.innerHTML;
    messageDOM = messageDOM.getElementsByClassName("message")[0];

    function closeMessage(message) {
        if (messageBox.contains(message)) {
            messageBox.removeChild(message);
        }
    }

    function closeMessageTimeout(message, timeBeforeClose) {
        setTimeout(function() { closeMessage(message) }, timeBeforeClose);
    }

    function createNewMessage(text) {
        var message = messageDOM.cloneNode(true);
        var textNode = message.getElementsByClassName("message_text")[0];
        var closeNode = message.getElementsByClassName("message_close")[0];

        messageBox.appendChild(message);
        textNode.innerHTML = text;
        closeNode.onclick = function() {
            closeMessage(message)
        };

        return message;
    }

    return {
        newMessage: function (messageText, styleClass) {
            var message = createNewMessage(messageText);

            Utils.addClass(message, styleClass);
            closeMessageTimeout(message, messageTimeout);
            Utils.removeClass(message, "hidden");
        },

        newError: function(text) {
            this.newMessage(text, "message_error")
        },

        newSuccess: function(text) {
            this.newMessage(text, "message_success")
        }
    }
}

// SignedInView state
function SignedInView(session) {

    var profileNode = ViewUtils.createElementFromView("profile_view");
    var postNode = ViewUtils.createElementFromView("post_view", "post");

    function displayTab(currentTabId, selectedTabId){
        var currentTab = document.getElementById(currentTabId);
        var selectedTab = document.getElementById(selectedTabId);

        Utils.addClass(currentTab, "hidden");
        Utils.removeClass(selectedTab, "hidden");
    }

    function createTabEvents(){
        var tabs = document.getElementsByClassName("menu_tab");

        Array.prototype.forEach.call(tabs, function(tab){
            tab.onclick = function(){
                var currentTab = document.getElementsByClassName("selected")[0];
                var currentTabId = currentTab.getAttribute("rel");
                var selectedTabId = tab.getAttribute("rel");

                Utils.removeClass(currentTab, "selected");
                Utils.addClass(tab, "selected");

                displayTab(currentTabId, selectedTabId);
            };
        });
    }

    function populateHomeTab() {
        var response = session.getCurrentUserData();

        if (!response.success) { // just in case
            messages.newError(response.message);
            return false;
        }

        var data = response.data;
        var profile = profileNode.cloneNode(true);
        var profileContainer = document.getElementById("home_profile");

        profile.getElementsByClassName("profile_email")[0].innerHTML = data.email;
        profile.getElementsByClassName("profile_name")[0].innerHTML = data.firstname +" "+ data.familyname;
        profile.getElementsByClassName("profile_gender")[0].innerHTML = (data.gender === "m") ? "Male" : "Female";
        profile.getElementsByClassName("profile_city")[0].innerHTML = data.city;
        profile.getElementsByClassName("profile_country")[0].innerHTML = data.country;

        profileContainer.appendChild(profile);
    }

    function refreshHomeWall() {
        var response = session.getCurrentUserMessages();
        if (!response.success) {
            messages.newError(response.message);
        }

        var newWall = document.createElement("div");
        newWall.classList.add("post_wall");

        var posts = response.data || [];
        Array.prototype.forEach.call(posts, function(post) {
            var newPostNode = postNode.cloneNode(true);
            newPostNode.getElementsByClassName("post_text")[0].innerHTML = post.content;
            newPostNode.getElementsByClassName("post_user")[0].innerHTML = "by "+ post.writer;
            newWall.appendChild(newPostNode);
        });

        var homeWall = document.getElementById("home_wall");
        Utils.removeAllChilds(homeWall);
        homeWall.appendChild(newWall);
    }

    function createHomeEvents() {
        var homePost = document.getElementById("home_post_message");

        homePost.onsubmit = function() {
            var content = document.getElementById("home_post_textarea");
            if (content && content.value) {
                var response = session.postMessageOnWall(content.value);
                if (response.success) {
                    content.value = "";
                    messages.newSuccess(response.message);
                    refreshHomeWall();
                } else {
                    messages.newError(response.message);
                }
            } else {
                messages.newError("Cannot post empty messages!")
            }

            return false;
        }
    }

    return {
        displayView: function() {
            ViewUtils.displayViewFromId("login_view", "current_view");
            createTabEvents();
            populateHomeTab();
            createHomeEvents();
            refreshHomeWall();
        }
    }
}

// WelcomeView state
function WelcomeView(session) {

    var minPasswordLength = 6;

    function isPasswordLengthValid(password) {
        return (typeof(password) === "string" &&
        password.length >= minPasswordLength)
    }

    function validateLoginForm() {
        var password = document.getElementById("user_password");

        if (password && isPasswordLengthValid(password.value)) {
            Utils.removeClass(password, "invalid_input");
        } else {
            Utils.addClass(password, "invalid_input");
            messages.newError("Password is empty or too short, try again!");

            return false;
        }

        return true;
    }

    function validateSignupForm() {

        // password
        var password = document.getElementById("password");
        var repeatPassword = document.getElementById("repeat_password");
        if (password.value && isPasswordLengthValid(password.value) && (password.value === repeatPassword.value)) {
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

        login.onsubmit = function (e) {
            if (validateLoginForm()) {
                var userEmail = document.getElementById("user_email");
                var userPassword = document.getElementById("user_password");
                session.signIn(userEmail.value, userPassword.value)
            }

            return false;
        };

        signup.onsubmit = function (e) {
            if (validateSignupForm()) {

                var signUpForm = {
                    email: document.getElementById("username").value,
                    password: document.getElementById("password").value,
                    firstname: document.getElementById("first_name").value,
                    familyname: document.getElementById("family_name").value,
                    gender: document.getElementById("gender").value,
                    city: document.getElementById("city").value,
                    country: document.getElementById("country").value
                };

                session.signUp(signUpForm);
            }

            return false;
        };
    }

    return {
        displayView: function () {
            ViewUtils.displayViewFromId("welcome_view", "current_view");
            addEvents();
        }
    };
}

// Session encapsulate the current session state.
// Upon changes to this state, it'll use the notifySessionChange method
// ( Currently the displayView() )
function Session(server, notifySessionChange) {
    var TOKEN = "sessionToken";

    var sessionToken = localStorage.getItem(TOKEN);

    function changeToken(token) {
        localStorage.setItem(TOKEN, token);
        sessionToken = token;
    }

    return {
        signUp: function (userForm) {
            var response = server.signUp(userForm);

            if (response.success) {
                messages.newSuccess(response.message);
                this.signIn(userForm.email, userForm.password);
            } else {
                messages.newError(response.message);
            }
        },

        signIn: function (username, password) {
            var response = server.signIn(username, password);
            if (response.success) {
                changeToken(response.data);
                notifySessionChange();
            }

            return {success: response.success, message: response.message};
        },

        isSignedIn: function () {
            var response = server.getUserMessagesByToken(sessionToken);
            return response.success;
        },

        signOut: function () {
            server.signOut(sessionToken);
            notifySessionChange();
        },

        getCurrentUserData: function() {
            return server.getUserDataByToken(sessionToken);
        },

        getCurrentUserMessages: function () {
            return server.getUserMessagesByToken(sessionToken);
        },

        postMessage: function(message, toEmail) {
            return server.postMessage(sessionToken, message, toEmail);
        },

        postMessageOnWall: function(message) {
            var response = this.getCurrentUserData();
            if (!response.success) {
                return { success: response.success, message: response.message }
            }

            var email = response.data.email;
            return this.postMessage(message, email);
        }
    }
}

function displayMessage(message) {
    var messageElement = document.getElementById("message");
    messageElement.innerHTML = message;
    Utils.removeClass(messageElement.parentNode, "hidden");
}

// Main "refresh" of the website
var displayView = function () {
    if (session.isSignedIn()) {
        signedInView.displayView();
    } else {
        welcomeView.displayView();
    }
};

// "App" constructor
window.onload = function () {
    messages = new Messages(5000);

    session = new Session(serverstub, displayView);
    signedInView = new SignedInView(session);
    welcomeView = new WelcomeView(session);

    displayView();
};
