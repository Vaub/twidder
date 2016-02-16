from gevent.wsgi import WSGIServer
import werkzeug.debug
import werkzeug.serving

import twidder


@werkzeug.serving.run_with_reloader
def run_server(port=5000, debug=False):
    app = twidder.app
    if debug:
        app = werkzeug.debug.DebuggedApplication(app)

    http_server = WSGIServer(('', port), app)
    http_server.serve_forever()


run_server(debug=True)
