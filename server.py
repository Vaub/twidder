from gevent.wsgi import WSGIServer

import twidder

http_server = WSGIServer(('', 5000), twidder.app)
http_server.serve_forever()
