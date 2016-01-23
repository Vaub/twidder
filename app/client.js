'use strict';

function isElementAView(element) {
	return (element instanceof HTMLElement) && 
		(element.getAttribute("type") === "text/view");
}

function displayViewFromId(toDisplayId, viewContainerId) {
	var view = document.getElementById(viewContainerId);
	var viewToDisplay = document.getElementById(toDisplayId);

	if (!isElementAView(viewToDisplay)) {
		return false;
	}

	view.innerHTML = viewToDisplay.innerHTML;
}

function addClass(element, classToAdd) {
    if (!(element instanceof HTMLElement)) {
        return false;
    }

    if (!element.classList.contains(classToAdd)) {
        element.classList.add(classToAdd);
    }
}

function removeClass(element, classToRemove) {
    if (!(element instanceof HTMLElement)) {
        return false;
    }

    if (element.classList.contains(classToRemove)) {
        element.classList.remove(classToRemove);
    }
}

function displayMessage(message){
    var messageElement = document.getElementById("message");
    messageElement.innerHTML = message;
    removeClass(messageElement.parentNode, "hidden");
}

var welcomeView;
welcomeView = (function () {

    var minPasswordLength = 6;

    function validateSignupForm() {

        // password
        var password = document.getElementById("password");
        var repeatPassword = document.getElementById("repeat_password");
        if (password.value && password.value.length >= minPasswordLength && (password.value === repeatPassword.value)) {
            removeClass(password, "invalid_input");
            removeClass(repeatPassword, "invalid_input");
        } else {
            addClass(password, "invalid_input");
            addClass(repeatPassword, "invalid_input");
            return false;
        }

        return true;
    }

    function addEvents() {
        var password = document.getElementById("password");
        var repeatPassword = document.getElementById("repeat_password");
        var signup = document.getElementById("signup");

        signup.onsubmit = function (e) {
            if (validateSignupForm()) {

                var signUpForm = {
                    'email': document.getElementById("username").value,
                    'password': document.getElementById("password").value,
                    'firstname': document.getElementById("first_name").value,
                    'familyname': document.getElementById("family_name").value,
                    'gender': document.getElementById("gender").value,
                    'city': document.getElementById("city").value,
                    'country': document.getElementById("country").value
                };

                displayMessage(serverstub.signUp(signUpForm).message);
            }
            return false;
        };
    }

    return {
        displayView: function () {
            displayViewFromId("welcome_view", "current_view");
            addEvents();
        }
    };
})();

var displayView = function() {
	welcomeView.displayView();
};

window.onload = function() {
    var messageButtons = document.getElementById("message_ok");
    messageButtons.onclick = function() {
            addClass(messageButtons.parentNode,"hidden");
        };

	displayView();
};
