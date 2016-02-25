'use strict';

var TEMPLATE_PATH = "templates/";

function Templates() {

    var nbTemplatesRendering = 0;
    var toCompile = [];
    var templates = {};

    function onCompletionCallback(callback) {
        nbTemplatesRendering--;
        if (nbTemplatesRendering == 0 && toCompile.length == 0) {
            callback();
        }
    }

    function compileTemplate(name, onCompletion) {
        var filename = TEMPLATE_PATH + name + ".hbs";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", filename, true);

        new XhrSender(xhr)
            .onSuccess(function(r) {
                templates[name] = Handlebars.compile(r);
                onCompletionCallback(onCompletion);
            })
            .onError(function() {
                onCompletionCallback(onCompletion);
            })
            .asText()
            .send();
    }

    return {
        add: function(name) {
            toCompile.push(name);
            nbTemplatesRendering++;

            return this;
        },

        compile: function(onCompletion) {
            while(toCompile.length != 0) {
                compileTemplate(toCompile.pop(), onCompletion)
            }
        },

        use: function(name, context) {
            var template = templates[name];
            if (!template) {
                return;
            }

            return template(context || {});
        }
    }
}