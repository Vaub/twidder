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

    // Use the view to create a <div> encapsulating an element.
    // Can optionally give it a class
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

    // Remove all child from an HTMLElement
    removeAllChild: function(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
};

// Creates messages (alerts) for the website no matter the view
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
        setTimeout(function () {
            closeMessage(message)
        }, timeBeforeClose);
    }

    function createNewMessage(text) {
        var message = messageDOM.cloneNode(true);
        var textNode = message.getElementsByClassName("message_text")[0];
        var closeNode = message.getElementsByClassName("message_close")[0];

        messageBox.appendChild(message);
        textNode.innerHTML = text;
        closeNode.onclick = function () {
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

// SignedInView state
function SignedInView(session) {

    var profileNode = ViewUtils.createElementFromView("profile_view");
    var postNode = ViewUtils.createElementFromView("post_view", "post");
    var templateHomeNode = ViewUtils.createElementFromView("template_home_view");

    var home = templateHomeNode.cloneNode(true);

    function displayTab(currentTabId, selectedTabId){
        var currentTab = document.getElementById(currentTabId);
        var selectedTab = document.getElementById(selectedTabId);

        Utils.addClass(currentTab, "hidden");
        Utils.removeClass(selectedTab, "hidden");
    }

    function createTabEvents() {
        var tabs = document.getElementsByClassName("menu_tab");

        Array.prototype.forEach.call(tabs, function (tab) {
            tab.onclick = function () {
                var currentTab = document.getElementsByClassName("selected")[0];
                var currentTabId = currentTab.getAttribute("rel");
                var selectedTabId = tab.getAttribute("rel");

                Utils.removeClass(currentTab, "selected");
                Utils.addClass(tab, "selected");

                displayTab(currentTabId, selectedTabId);
            };
        });
    }

    function createAccountTabEvents() {
        var changePasswordForm = document.getElementById("change_password");
        var signOut = document.getElementById("sign_out");

        changePasswordForm.onsubmit = function () {
            var oldPassword = document.getElementById("old_password").value;
            var newPassword = document.getElementById("new_password").value;
            var response = session.changePassword(oldPassword, newPassword);

            messages.newStatusMessage(response.message, response.success);

            return false;
        };

        signOut.onclick = function(){
            session.signOut();
        }
    }

    function populateProfile(data, userHome){

        var profile = profileNode.cloneNode(true);
        var profileContainer = userHome.getElementsByClassName("home_profile")[0];

        profile.getElementsByClassName("profile_email")[0].innerHTML = data.email;
        profile.getElementsByClassName("profile_name")[0].innerHTML = data.firstname +" "+ data.familyname;
        profile.getElementsByClassName("profile_gender")[0].innerHTML = (data.gender === "m") ? "Male" : "Female";
        profile.getElementsByClassName("profile_city")[0].innerHTML = data.city;
        profile.getElementsByClassName("profile_country")[0].innerHTML = data.country;

        Utils.removeAllChild(profileContainer);
        profileContainer.appendChild(profile);
    }

    function populateHomeTab() {
        var response = session.getCurrentUserData();

        if (!response.success) { // just in case
            messages.newError(response.message);
            return false;
        }

        var data = response.data;
        var homeContainer = document.getElementById("home");

        populateProfile(data, home);

        homeContainer.appendChild(home);
    }

    function fillWall(data){

        var newWall = document.createElement("div");
        newWall.classList.add("post_wall");

        var posts = data || [];
        Array.prototype.forEach.call(posts, function(post) {
            var newPostNode = postNode.cloneNode(true);
            newPostNode.getElementsByClassName("post_text")[0].innerHTML = post.content;
            newPostNode.getElementsByClassName("post_user")[0].innerHTML = "by "+ post.writer;
            newWall.appendChild(newPostNode);
        });

        return newWall;
    }

    function refreshHomeWall() {
        var response = session.getCurrentUserMessages();
        if (!response.success) {
            messages.newError(response.message);
        }

        var newWall = fillWall(response.data);
        var homeWall = home.getElementsByClassName("home_wall")[0];

        Utils.removeAllChild(homeWall);
        homeWall.appendChild(newWall);
    }

    function refreshBrowseWall(wall, email){
        var response = session.getOtherUserMessagesByEmail(email);

        if(response.success){
            var newWall = fillWall(response.data);
            Utils.removeAllChild(wall);
            wall.appendChild(newWall);

            messages.newSuccess(response.message);
        }
        else{
            messages.newSuccess(response.message);
        }
    }

    function createHomeTabEvents() {
        var homePost = document.getElementsByClassName("home_post_message")[0];
        var homeRefreshWall = document.getElementById("home_refresh_wall");

        homePost.onsubmit = function() {
            var content = document.getElementsByClassName("home_post_textarea")[0];

            if (content && content.value) {
                var response = session.postMessageOnWall(content.value);
                if (response.success) {
                    content.value = "";
                    refreshHomeWall();
                }

                messages.newStatusMessage(response.message, response.success);
            } else {
                messages.newError("Cannot post empty messages!")
            }

            return false;
        };

            homeRefreshWall.onclick = function() {
            refreshHomeWall();
        }
    }

    function createBrowseTabEvents(){
        var email;
        var otherUserHome = templateHomeNode.cloneNode(true);
        var searchForm = document.getElementById("search_form");
        var postForm = otherUserHome.getElementsByClassName("home_post_message")[0];
        var homeWall = otherUserHome.getElementsByClassName("home_wall")[0];

        postForm.onsubmit = function(){
            var content = otherUserHome.getElementsByClassName("home_post_textarea")[0];

            if(content && content.value){
                var response = session.postMessage(content.value, email);
                if(response.success){
                    content.value = "";
                    refreshBrowseWall(homeWall, email);
                    messages.newSuccess(response.message);
                } else {
                    messages.newError(response.message);
                }
            } else {
                messages.newError("Cannot post empty messages!")
            }
            return false;
        };

        searchForm.onsubmit = function(){
            email = searchForm.otherUsername.value;
            var response = session.getOtherUserDataByEmail(email);

            if(response.success){
                var data = response.data;
                var homeContainer = document.getElementById("other_user_home");

                populateProfile(data, otherUserHome);
                Utils.removeAllChild(homeContainer);
                homeContainer.appendChild(otherUserHome);
                refreshBrowseWall(homeWall, email);

                messages.newSuccess(response.message);
            } else {
                messages.newError(response.message);
            }

            return false;
        };
    }

    function initializeView() {
        createTabEvents();
        createAccountTabEvents();
        populateHomeTab();
        createHomeTabEvents();
        createBrowseTabEvents();
    }

    return {
        displayView: function () {
            ViewUtils.displayViewFromId("login_view", "current_view");
            initializeView();
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

    function validateLoginForm(form) {
        var password = form.user_password;

        if (password && isPasswordLengthValid(password.value)) {
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

        login.onsubmit = function () {
            if (validateLoginForm(login)) {
                var userEmail = login.user_email;
                var userPassword = login.user_password;

                var response = session.signIn(userEmail.value, userPassword.value);
                if (!response.success) {
                    messages.newError(response.message);
                }
            }

            return false;
        };

        signup.onsubmit = function () {
            if (validateSignupFormData(signup)) {

                var signUpForm = {
                    email: signup.username.value,
                    password: signup.password.value,
                    firstname: signup.first_name.value,
                    familyname: signup.family_name.value,
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

        changePassword: function (oldPassword, newPassword) {
            var response = server.changePassword(sessionToken, oldPassword, newPassword);
            return {success: response.success, message: response.message};
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
        },

        getOtherUserDataByEmail: function(email){
            return server.getUserDataByEmail(sessionToken, email);
        },

        getOtherUserMessagesByEmail: function(email){
            return server.getUserMessagesByEmail(sessionToken, email);
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
    var messagesDefaultTimeout = 5000;

    messages = new Messages(messagesDefaultTimeout);

    session = new Session(serverstub, displayView);
    signedInView = new SignedInView(session);
    welcomeView = new WelcomeView(session);

    displayView();
};
