'use strict';

var messages;

var session;
var signedInView;
var welcomeView;

var minPasswordLength = 6;

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
    },

    isPasswordLengthValid: function(password){
        return (typeof(password) === "string" && password.length >= minPasswordLength);
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

function Wall(getProfileFunction, getMessagesFunction, postMessageFunction) {

    var wallNode = ViewUtils.createElementFromView("template_home_view");
    var postNode = ViewUtils.createElementFromView("post_view", "post");

    var wall = wallNode.getElementsByClassName("home_wall")[0];
    var profile = wallNode.getElementsByClassName("profile")[0];
    var postText = wallNode.getElementsByClassName("home_post_textarea")[0];

    function populateProfile(data) {
        var profile = wallNode.getElementsByClassName("profile")[0];

        profile.getElementsByClassName("profile_email")[0].innerHTML = data.email;
        profile.getElementsByClassName("profile_name")[0].innerHTML = data.firstname +" "+ data.familyname;
        profile.getElementsByClassName("profile_gender")[0].innerHTML = (data.gender === "m") ? "Male" : "Female";
        profile.getElementsByClassName("profile_city")[0].innerHTML = data.city;
        profile.getElementsByClassName("profile_country")[0].innerHTML = data.country;
    }

    function fillWall(data) {
        var newWall = document.createElement("div");
        newWall.classList.add("post_wall");

        var posts = data || [];
        Array.prototype.forEach.call(posts, function(post) {
            var newPostNode = postNode.cloneNode(true);
            newPostNode.getElementsByClassName("post_text")[0].innerHTML = post.content;
            newPostNode.getElementsByClassName("post_user")[0].innerHTML = "by "+ post.writer;
            newWall.appendChild(newPostNode);
        });

        Utils.removeAllChild(wall);
        wall.appendChild(newWall);
    }

    function refreshWall() {
        var response = getMessagesFunction();
        if (!response.success) {
            messages.newError(response.message);
            return false;
        }

        fillWall(response.data);
    }

    function postMessage(message) {
        var response = postMessageFunction(message);
        if (!response.success) {
            message.newError(response.message);
        }

        return response.success;
    }

    function createHandlers() {
        var postForm = wallNode.getElementsByClassName("wall_post_message")[0];
        var refreshButton = wallNode.getElementsByClassName("wall_refresh")[0];

        postForm.onsubmit = function() {
            if (postText.value && postMessage(postText.value)) {
                postText.value = "";
            }

            refreshWall();
            return false;
        };

        refreshButton.onclick = function() {
            refreshWall();
            return false;
        };
    }

    function init() {
        var messagesResponse = getMessagesFunction();
        var profileResponse = getProfileFunction();
        createHandlers();

        if (profileResponse.success) {
            populateProfile(profileResponse.data)
        }

        if (messagesResponse.success) {
            fillWall(messagesResponse.data)
        }
    }

    init();

    return {
        refreshWall: refreshWall,
        element: wallNode
    }

}

// SignedInView state
function SignedInView(session) {

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
            var oldPassword = changePasswordForm.oldPassword.value;
            var newPassword = changePasswordForm.newPassword.value;

            if(Utils.isPasswordLengthValid(newPassword)){
                var response = session.changePassword(oldPassword, newPassword);
                messages.newStatusMessage(response.message, response.success);

                changePasswordForm.oldPassword.value = "";
                changePasswordForm.newPassword.value = "";
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

        var getHomeProfile = function() { return session.getCurrentUserData(); };
        var getHomeMessages = function() { return session.getCurrentUserMessages(); };
        var postHomeMessage = function(message) { return session.postMessageOnWall(message) };

        var homeWall = new Wall(getHomeProfile, getHomeMessages, postHomeMessage);
        Utils.removeAllChild(homeViewContainer);
        homeViewContainer.appendChild(homeWall.element);
    }

    function createBrowseTab() {
        var browseViewContainer = document.getElementById("browse_view_container");
        var searchForm = document.getElementById("search_form");

        searchForm.onsubmit = function(){
            var email = searchForm.otherUsername.value;
            var response = session.getOtherUserDataByEmail(email);

            if(response.success){
                var getBrowseProfile = function() { return session.getOtherUserDataByEmail(email); };
                var getBrowseMessages = function() { return session.getOtherUserMessagesByEmail(email); };
                var postBrowseMessage = function(message) { return session.postMessage(message, email); };

                var browseWall = new Wall(getBrowseProfile, getBrowseMessages, postBrowseMessage);
                Utils.removeAllChild(browseViewContainer);
                browseViewContainer.appendChild(browseWall.element);

            } else {
                messages.newError(response.message);
            }

            return false;
        };
    }

    function initializeView() {
        createTabEvents();
        createAccountTabEvents();
        createHomeTab();
        createBrowseTab();
    }

    return {
        displayView: function () {
            ViewUtils.displayViewFromId("login_view", "current_view");
            initializeView();
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
                this.signIn(userForm.email, userForm.password);
            }
            messages.newStatusMessage(response.message, response.success);
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
