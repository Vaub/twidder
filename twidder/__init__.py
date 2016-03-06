import os

import jinja2
from flask import Flask
from flask_sockets import Sockets

CURRENT_DIRECTORY = os.path.dirname(__file__)
STATIC_FOLDER = os.path.join("twidder", "static")

app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)
app.config["SECRET_KEY"] = os.urandom(24).encode("hex")
app.root_path = os.getcwd()

app.jinja_loader = jinja2.ChoiceLoader([
    app.jinja_loader,
    jinja2.FileSystemLoader(os.path.join(CURRENT_DIRECTORY, "static"))
])

sockets = Sockets(app)

from . import twidder
