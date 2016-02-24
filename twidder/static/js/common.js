'use strict';

var noCallback = function(){};

var minPasswordLength = 6;

/**
 * Utility class, mainly DOM manipulation
 */
var Utils = {
    addClass: function (element, classToAdd) {
        if (!(element instanceof HTMLElement) || element.classList.contains(classToAdd)) {
            return false;
        }
        element.classList.add(classToAdd);
    },

    removeClass: function (element, classToRemove) {
        if (!(element instanceof HTMLElement) || !element.classList.contains(classToRemove)) {
            return false;
        }
        element.classList.remove(classToRemove);
    },

    createElement: function(template, withClass) {
        var element = document.createElement("div");

        element.innerHTML = template;
        if (withClass && typeof(withClass) === "string") {
            Utils.addClass(element, withClass);
        }

        return element;
    },

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