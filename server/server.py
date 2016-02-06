import uuid
from flask import Flask, json, request, abort

import database_helper as db

MIN_PASSWORD_LENGTH = 6
DATABASE = "database.db"

app = Flask(__name__)


class User(object):
    def __init__(self, email, password, first_name, family_name, gender, city, country):
        self.email = email
        self.password = password
        self.first_name = first_name
        self.family_name = family_name
        self.gender = gender
        self.city = city
        self.country = country
        self._validate()

    def _validate(self):
        if not (self.email and self.password and self.first_name and self.family_name and
                self.gender and self.city and self.country):
            raise UserNotValidError()

        if not is_gender_valid(self.gender):
            raise UserNotValidError("User gender is not valid.")

        if not is_password_valid(self.password):
            raise UserNotValidError("Password is not valid, use {min_char} characters minimum"
                                    .format(min_chars=MIN_PASSWORD_LENGTH))

    def has_password(self, password):
        return self.password == password

    @staticmethod
    def find_user(email):
        return User(**db.select_user(email))


def is_user_present(email):
    try:
        return bool(User.find_user(email))
    except db.UserDoesNotExist:
        return False


class ApiError(Exception):
    def __init__(self, message, status_code=None):
        super(ApiError, self).__init__(message)
        self.status_code = status_code or 500


class UserNotValidError(Exception):
    def __init__(self, message=None):
        super(UserNotValidError, self).__init__(message or "User not valid.")


class CouldNotLoginError(Exception):
    def __init__(self, message=None):
        super(CouldNotLoginError, self).__init__(message or "Could not login, be sure that your credentials are valid.")


class SessionNotValidError(Exception):
    pass


def is_password_valid(password):
    return password and len(password) >= MIN_PASSWORD_LENGTH


def is_gender_valid(gender):
    return gender and gender in ["m", "f"]


def identify(token):
    try:
        email = db.select_session(token)
        return User.find_user(email)
    except (db.SessionDoesNotExistError, db.UserDoesNotExist):
        raise SessionNotValidError()


def make_json(status_code, message):
    content = {"status_code": status_code, "message": message}
    response = json.jsonify(content)
    response.status_code = status_code

    return response


@app.before_request
def before_request():
    db.connect_db(DATABASE)


@app.teardown_request
def teardown_request(e):
    db.close_db()


@app.route("/")
def hello():
    return "Hello World!"


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    user = User(**data)

    if is_user_present(user.email):
        raise UserNotValidError()

    return make_json(200, "User was added")


@app.route("/login", methods=['POST'])
def login():
    auth = request.authorization
    if not _is_auth_data_valid(auth):
        raise CouldNotLoginError(
            "Could not get credentials. Be sure to use Basic Authentication")

    try:
        user = User.find_user(auth.username)
        if not user.has_password(auth.password):
            raise CouldNotLoginError()

        return _create_user_session(user)
    except db.UserDoesNotExist:
        raise CouldNotLoginError()


def _is_auth_data_valid(auth):
    try:
        return auth.password and auth.username
    except AttributeError:
        return False


def _create_user_session(user):
    token = str(uuid.uuid4())
    try:
        db.persist_session(user.email, token)
        return token
    except db.CouldNotCreateSessionError:
        raise ApiError("Could not create session.")


@app.route("/users/changePassword", methods=["PUT"])
def change_password():
    user = identify(request.headers["X-Session-Token"])

    data = request.get_json()
    if not _is_password_data_valid(data):
        abort(400)

    try:
        if (not user.password == data["oldPassword"]) or not is_password_valid(data["newPassword"]):
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


@app.route("/logout", methods=["POST"])
def logout():
    token = request.headers["X-Session-Token"]
    identify(token)
    db.delete_session(token)

    return make_json(200, "Logout successful.")


def _does_session_exist(token):
    try:
        db.select_session(token)
        return True
    except db.SessionDoesNotExistError:
        return False


@app.route("/users/data", methods=["GET"])
def get_user_data_by_token():
    token = request.headers["X-Session-Token"]
    user = identify(token)
    return json.jsonify(_create_user_info(user))


@app.route("/users/data/<email>", methods=["GET"])
def get_user_data_by_email(email):
    token = request.headers["X-Session-Token"]
    identify(token)
    if not is_user_present(email):
        raise UserNotValidError("User does not exist")

    other_user = User.find_user(email)
    return json.jsonify(_create_user_info(other_user))


def _create_user_info(user):
     return {"email":user.email, "first_name":user.first_name, "family_name":user.family_name,
             "gender":user.gender, "city":user.city, "country":user.country}


@app.errorhandler(400)
def bad_request(error):
    return make_json(400, error.message)


@app.errorhandler(UserNotValidError)
def user_not_valid(error):
    return make_json(400, error.message)


@app.errorhandler(SessionNotValidError)
def session_not_valid(error=None):
    return make_json(401, "Session is not valid.")


@app.errorhandler(CouldNotLoginError)
def could_not_login(error):
    return make_json(401, error.message)


@app.errorhandler(ApiError)
def generic_error(error):
    return make_json(error.status_code, error.message)

if __name__ == "__main__":
    app.run(debug=True)
