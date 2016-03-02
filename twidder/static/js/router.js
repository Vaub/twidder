function Twidder(session, welcomeView, signedInView) {

    var currentView;

    function changeTo(view) {
        if (currentView === view) {
            return;
        }

        view.displayView();
        currentView = view;
    }

    function ifSignedIn(isSignedIn) {
        session.isSignedIn(
            function() {
                changeTo(signedInView);
                isSignedIn();
            },
            function() {
                changeTo(welcomeView);
            }
        );
    }

    page("/", function() {
        ifSignedIn(function() {
            signedInView.displayHome();
        });
    });

    page("/browse", function() {
        ifSignedIn(function() {
            signedInView.displayUser();
        });
    });

    page("/browse/:email", function(ctx) {
        ifSignedIn(function() {
           signedInView.displayUser(ctx.params["email"]);
        });
    });

    page("/account", function() {
        ifSignedIn(function() {
            signedInView.displayAccount();
        })
    });

    page("*", function() {
        page("/");
        messages.newError("Page does not exists!");
    });

    return {
        start: function() {
            page.start();
        }
    }
}