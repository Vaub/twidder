from flask import Flask, request, abort

import database_helper as db
from database_helper import User

MIN_PASSWORD_LENGTH = 6
DATABASE = "database.db"

app = Flask(__name__)


class UserNotValidError(Exception):
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

@app.errorhandler(400)
def bad_request(e):
    return "Your request was not valid", 400


@app.errorhandler(UserNotValidError)
def user_not_valid(e):
    return "User is not valid", 400


if __name__ == "__main__":
    app.run(debug=True)
