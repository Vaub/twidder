'use strict'

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
};

var welcomeView = (function() {

	function validateSignupForm() {
		
		// password
		var password = document.getElementById("password");
		var repeatPassword = document.getElementById("repeat_password");
		if (password.value && (password.value === repeatPassword.value)) {
			repeatPassword.className = "";
		} else {
			repeatPassword.className = "invalid_input";
		}

		return true;
	};

	function addEvents() {
		var password = document.getElementById("password");
		var repeatPassword = document.getElementById("repeat_password");
		var signup = document.getElementById("signup");

		signup.onsubmit = function(e) {
			if (validateSignupForm()) {
			}

			return false;
		};
	};

	var view = {
		displayView: function() {
			displayViewFromId("welcome_view", "current_view");
			addEvents();
		}
	};

	return view;
})();

var displayView = function() {
	welcomeView.displayView();
};

window.onload = function() {
	displayView();
};
