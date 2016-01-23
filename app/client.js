'use strict';

var session;
var signedInView;
var welcomeView;

var ViewUtils = {
    isElementAView: function(element) {
        return (element instanceof HTMLElement) &&
            (element.getAttribute("type") === "text/view");
    },

    displayViewFromId: function(toDisplayId, viewContainerId) {
        var view = document.getElementById(viewContainerId);
        var viewToDisplay = document.getElementById(toDisplayId);

        if (!this.isElementAView(viewToDisplay)) {
            return false;
        }

        view.innerHTML = viewToDisplay.innerHTML;
    }
};

// Various utilities methods
var Utils = {
    // Add a class to an HTMLElement
    addClass: function(element, classToAdd) {
        if (!(element instanceof HTMLElement) || element.classList.contains(classToAdd)) {
            return false;
        }
        element.classList.add(classToAdd);
    },

    // Remove a class from an HTMLElement
    removeClass: function(element, classToRemove) {
        if (!(element instanceof HTMLElement) || !element.classList.contains(classToRemove)) {
            return false;
        }
        element.classList.remove(classToRemove);
    }
};

var Messages = {
    newMessage: function(messageText, styleClass) {
        var box = document.getElementById("message_box");
        var messageView = document.getElementById("message_view");

        var message = document.createElement("div");
        message.innerHTML = messageView.innerHTML;

        box.appendChild(message);

        var messageDiv = message.getElementsByClassName("message")[0];
        if (styleClass && typeof(styleClass) === "string") {
            messageDiv.classList.add(styleClass);
        }
        message.getElementsByClassName("message_text")[0].innerHTML = messageText;
        message.getElementsByClassName("message_close")[0].onclick = function() {
            box.removeChild(message);
        };
        messageDiv.classList.remove("hidden");
    },

    newError: function(text) {
        this.newMessage(text, "message_error")
    }
};

// SignedInView state
function SignedInView(session) {

    function displayTab(currentTabName, selectedTabName){
        var currentTab = document.getElementById(currentTabName);
        var selectedTab = document.getElementById(selectedTabName);

        Utils.addClass(currentTab, "hidden");
        Utils.removeClass(selectedTab, "hidden");
    }

    function tabularView(){
        var tabs = document.getElementsByClassName("menu_tab");

        Array.prototype.forEach.call(tabs, function(tab){
            tab.onclick = function(){
                var currentTab = document.getElementsByClassName("selected")[0];
                var currentTabName = currentTab.getAttribute("rel");
                var selectedTabName = tab.getAttribute("rel");

                Utils.removeClass(currentTab, "selected");
                Utils.addClass(tab, "selected");

                displayTab(currentTabName, selectedTabName);
            };
        });
    }

    return {
        displayView: function() {
            ViewUtils.displayViewFromId("login_view", "current_view");
            tabularView();
        }
    }
};

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
            return false;
        }

        return true;
    }

	function addEvents() {
        var login = document.getElementById("login");
		var signup = document.getElementById("signup");

        login.onsubmit = function(e) {
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

                Messages.newMessage(serverstub.signUp(signUpForm).message);
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
};

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
        signIn: function(username, password) {
            var response = server.signIn(username, password);
            if (response.success) {
                changeToken(response.data);
                notifySessionChange();
            }

            return { success: response.success, message: response.message };
        },

        isSignedIn: function() {
            var response = server.getUserMessagesByToken(sessionToken);
            return response.success;
        },

        signOut: function() {
            server.signOut(sessionToken);
            notifySessionChange();
        }
    }
};

function displayMessage(message){
    var messageElement = document.getElementById("message");
    messageElement.innerHTML = message;
    Utils.removeClass(messageElement.parentNode, "hidden");
}

// Main "refresh" of the website
var displayView = function() {
    if (session.isSignedIn()) {
        signedInView.displayView();
    } else {
        welcomeView.displayView();
    }
};

window.onload = function() {
    session = new Session(serverstub, displayView);
    signedInView = new SignedInView(session);
    welcomeView = new WelcomeView(session);

	displayView();
};
