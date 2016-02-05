import uuid
from flask import Flask, request, abort

import database_helper as db
from database_helper import User

MIN_PASSWORD_LENGTH = 6
DATABASE = "database.db"

app = Flask(__name__)


class UserNotValidError(Exception):
    def __init__(self): pass


class SessionNotFoundError(Exception):
    def __init__(self): pass


@app.before_request
def before_request():
    db.connect_db(DATABASE)


@app.teardown_request
def teardown_request(e):
    db.close_db()


@app.route("/")
def hello():
    return "Hello World!"


@app.route("/signUp", methods=["POST"])
def sign_up():
    data = request.get_json()
    if not is_user_data_valid(data):
        abort(400)

    user = User(data["email"], data["password"],
                data["first_name"], data["family_name"], data["gender"],
                data["city"], data["country"])

    if not is_user_valid(user) or does_user_exist(user):
        raise UserNotValidError()

    return "User was added: {}".format(db.persist_user(user))


def is_user_data_valid(data):
    try:
        return (data["email"] and data["password"] and
                data["first_name"] and data["family_name"] and data["gender"] and
                data["city"] and data["country"])
    except KeyError:
        return False


def is_user_valid(user):
    return len(user.password) >= MIN_PASSWORD_LENGTH


def does_user_exist(user):
    try:
        db.select_user(user.email)
        return True
    except db.UserDoesNotExist:
        return False


@app.route("/signIn", methods=['POST'])
def sign_in():
    auth = request.authorization
    if not _is_auth_valid(auth):
        abort(401)

    try:
        user = db.select_user(auth.username)

        if not _is_password_equivalent(user.password, auth.password):
            abort(401)
        return _create_user_session(user)
    except db.UserDoesNotExist:
        abort(401)


def _is_auth_valid(auth):
    try:
        return auth.password and auth.username
    except AttributeError:
        return False


def _is_password_equivalent(password, received):
    return password == received


def _create_user_session(user):
    token = str(uuid.uuid4())
    try:
        db.persist_session(user.email, token)
        return token
    except db.CouldNotCreateSessionError:
        abort(401)


@app.route("/signOut", methods=["POST"])
def sign_out():
    token = request.headers["Session-Token"]
    if not _does_session_exist(token):
        raise SessionNotFoundError()

    db.delete_session(token)
    return "Signed out"


def _does_session_exist(token):
    try:
        db.select_session(token)
        return True
    except db.SessionDoesNotExist:
        return False


@app.errorhandler(SessionNotFoundError)
def session_not_found(e):
    return "Session not found", 400

@app.errorhandler(400)
def bad_request(e):
    return "Your request was not valid", 400


@app.errorhandler(UserNotValidError)
def user_not_valid(e):
    return "User is not valid", 400


if __name__ == "__main__":
    app.run(debug=True)
