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

var welcomeView = (function() {

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

		signup.onsubmit = function(e) {
			if (validateSignupForm()) {
                alert("Everything is valid!")
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
	displayView();
};
