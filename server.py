from gevent.wsgi import WSGIServer
from twidder import app as twidder

DATABASE = "database.db"
DATABASE_SCHEMA = "twidder/database.schema"

app = twidder.app
twidder.init_app(DATABASE, DATABASE_SCHEMA)

http_server = WSGIServer(('', 5000), app)
http_server.serve_forever()
