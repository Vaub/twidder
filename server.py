from gevent.wsgi import WSGIServer
from twidder import app as twidder

DATABASE = "database/database.db"
DATABASE_SCHEMA = "database/database.schema"

app = twidder.app

twidder.DATABASE = DATABASE
twidder.init_app(DATABASE, DATABASE_SCHEMA)

http_server = WSGIServer(('', 5000), app)
http_server.serve_forever()
