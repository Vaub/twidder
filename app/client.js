'use strict'

var isElementAView = function(element) {
	return (element instanceof HTMLElement) && 
		(element.getAttribute("type") === "text/view");
}

var displayViewFromId = function(toDisplayId, viewContainerId) {
	var view = document.getElementById(viewContainerId);
	var viewToDisplay = document.getElementById(toDisplayId);

	if (!isElementAView(viewToDisplay)) {
		return false;
	}

	view.innerHTML = viewToDisplay.innerHTML;
};

var welcomeView = (function() {

	var isPasswordValid = function(password, repeatPassword) {
		return (password instanceof HTMLElement && repeatPassword instanceof HTMLElement) &&
			(password.value) && (password.value === repeatPassword.value);
	};

	var addEvents = function() {
		var password = document.getElementById("password");
		var repeatPassword = document.getElementById("repeat_password");
		var signup = document.getElementById("signup");

		signup.onsubmit = function(e) {
			if (!isPasswordValid(password, repeatPassword)) {
				alert("password invalid!");
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
