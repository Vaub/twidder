import uuid
from flask import Flask, request, abort

import database_helper as db
from database_helper import User

MIN_PASSWORD_LENGTH = 6
DATABASE = "database.db"

app = Flask(__name__)


class UserNotValidError(Exception):
    def __init__(self): pass


class CouldNotLoginError(Exception):
    def __init__(self): pass

def validate_password(password):
    return len(password) >= MIN_PASSWORD_LENGTH


def identify(token):
    try:
        email = db.select_session(token)
        return db.select_user(email)
    except (db.SessionDoesNotExistError, db.UserDoesNotExist):
        abort(401)


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
    return validate_password(user.password)


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


@app.route("/users/changePassword", methods=["PUT"])
def change_password():
    user = identify(request.headers["X-Session-Token"])

    data = request.get_json()
    if not _is_password_data_valid(data):
        abort(400)

    try:
        if (not user.password == data["oldPassword"]) or not validate_password(data["newPassword"]):
            abort(400)

        user.password = data["newPassword"]
        if not db.persist_user(user):
            abort(500)

        return "Password changed"
    except db.UserDoesNotExist:
        abort(401)


def _is_password_data_valid(data):
    try:
        return data["oldPassword"] and data["newPassword"]
    except KeyError:
        return False


@app.errorhandler(400)
def bad_request(e):
    return "Your request was not valid", 400


@app.errorhandler(UserNotValidError)
def user_not_valid(e):
    return "User is not valid", 400


if __name__ == "__main__":
    app.run(debug=True)
