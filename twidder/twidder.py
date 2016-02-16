import uuid, os

import werkzeug.security as security
from flask import Flask, json, request, escape, abort, send_from_directory

import database_helper as db


SESSION_TOKEN = "X-Session-Token"

COULD_NOT_POST_MESSAGE = "Could not post message."

CONFIG = {
    "database": "database/database.db",
    "database_schema": "database/database.schema",
    "min_password_length": 6
}

STATIC_FOLDER = os.path.join("twidder", "static")

app = Flask(__name__, static_url_path='', static_folder=STATIC_FOLDER)
app.root_path = os.getcwd()

db.init_database(CONFIG["database"], CONFIG["database_schema"])


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


class CouldNotPostMessageError(Exception):
    pass


class SessionNotValidError(Exception):
    pass


class Session(object):
    def __init__(self, user, token=None):
        self.user = user
        self.token = token or str(uuid.uuid4())
        self._validate()

    def _validate(self):
        if not (self.user and self.token):
            raise SessionNotValidError()
        if not isinstance(self.user, User):
            raise SessionNotValidError()

    def persist(self):
        try:
            db.persist_session(self.user.email, self.token)
        except db.CouldNotCreateSessionError:
            raise ApiError("Could not create session.")

    def close(self):
        db.delete_session(self.token)

    @staticmethod
    def find_session(token):
        try:
            user_email = db.select_session(token)
            return Session(User.find_user(user_email), token)
        except (db.SessionDoesNotExistError, db.UserDoesNotExist, UserNotValidError):
            raise SessionNotValidError()


class Post(object):
    def __init__(self, to_user, from_user, content, date_posted):
        self.date_posted = date_posted
        self.content = content
        self.from_user = from_user
        self.to_user = to_user


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
                                    .format(min_chars=CONFIG["min_password_length"]))

    def check_password(self, password):
        return security.check_password_hash(self.password, password)

    def get_messages(self):
        messages = db.select_messages(self.email)
        return [Post(**m) for m in messages]

    def post_message(self, to_user_email, message):
        if not (to_user_email and message):
            raise CouldNotPostMessageError(COULD_NOT_POST_MESSAGE)

        try:
            User.find_user(to_user_email)
        except UserNotValidError:
            raise CouldNotPostMessageError(COULD_NOT_POST_MESSAGE)

        try:
            db.insert_message(to_user_email, self.email, message)
        except db.CouldNotInsertMessage:
            raise CouldNotPostMessageError(COULD_NOT_POST_MESSAGE)

    def persist(self):
        if not db.persist_user(self.__dict__):
            raise Exception("User could not be persisted???")

    @staticmethod
    def exists(email):
        try:
            return bool(User.find_user(email))
        except UserNotValidError:
            return False

    @staticmethod
    def find_user(email):
        try:
            user_data = db.select_user(email)
            return User(**user_data)
        except db.UserDoesNotExist:
            raise UserNotValidError()

    @staticmethod
    def create_password(password):
        return security.generate_password_hash(password)


def is_password_valid(password):
    return password and len(password) >= CONFIG["min_password_length"]


def is_gender_valid(gender):
    return gender and gender in ["m", "f"]


def identify_session():
    token = request.headers[SESSION_TOKEN]
    return Session.find_session(token)


def create_response(status_code, message, data):
    content = {"status_code": status_code, "message": message, "data": data}
    response = json.jsonify(content)
    response.status_code = status_code

    return response


@app.before_request
def before_request():
    db.connect_db(CONFIG["database"])


@app.teardown_request
def teardown_request(e):
    db.close_db()


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(force=True)
    user = _create_user_to_register(data)

    if User.exists(user.email):
        raise UserNotValidError()

    user.persist()
    return create_response(200, "User was added.", [])


def _create_user_to_register(data):
    try:
        parsed_data = {k: escape(data[k]) for k in data}
        parsed_data["password"] = User.create_password(data["password"])

        return User(**parsed_data)
    except KeyError:
        raise UserNotValidError()


@app.route("/login", methods=['POST'])
def login():
    auth = request.authorization
    if not _is_auth_data_valid(auth):
        raise CouldNotLoginError(
                "Could not get credentials. Be sure to use Basic Authentication")

    try:
        user = User.find_user(auth.username)
        if not user.check_password(auth.password):
            raise CouldNotLoginError()

        session = Session(user)
        session.persist()
        return create_response(200, "Login successful.", session.token)
    except UserNotValidError:
        raise CouldNotLoginError()


def _is_auth_data_valid(auth):
    try:
        return auth.password and auth.username
    except AttributeError:
        return False


@app.route("/logout", methods=["POST"])
def logout():
    identify_session().close()
    return create_response(200, "Logout successful.", [])


@app.route("/changePassword", methods=["PUT"])
def change_password():
    user = identify_session().user
    data = request.get_json()
    if not _is_password_data_valid(data):
        abort(400)

    if (not user.check_password(data["oldPassword"])) or (not is_password_valid(data["newPassword"])):
        raise ApiError("Password is invalid.", 400)
    user.password = User.create_password(data["newPassword"])
    user.persist()

    return create_response(200, "Password changed.", [])


def _is_password_data_valid(data):
    try:
        return data["oldPassword"] and data["newPassword"]
    except KeyError:
        return False


@app.route("/profile", methods=["GET"])
def get_user_data_by_token():
    user = identify_session().user
    return create_response(200, "Data successfully retrieved.", _create_user_info(user))


@app.route("/profile/<email>", methods=["GET"])
def get_user_data_by_email(email):
    identify_session()
    other_user = User.find_user(email)

    return create_response(200, "Data successfully retrieved.", _create_user_info(other_user))


def _create_user_info(user):
    return {"email": user.email, "first_name": user.first_name, "family_name": user.family_name,
            "gender": user.gender, "city": user.city, "country": user.country}


@app.route("/messages", methods=["GET"])
def get_user_messages_by_token():
    user = identify_session().user
    messages = [m.__dict__ for m in user.get_messages()]
    return create_response(200, "Messages successfully retrieved.", messages)


@app.route("/messages/<email>", methods=["GET"])
def get_user_messages_by_email(email):
    identify_session()
    other_user = User.find_user(email)

    messages = [m.__dict__ for m in other_user.get_messages()]
    return create_response(200, "Messages successfully retrieved.", messages)


@app.route("/messages/<to_user_email>", methods=["POST"])
def post_message(to_user_email):
    user = identify_session().user
    data = request.get_json(force=True)
    if not _is_post_message_data_valid(data):
        abort(400)

    user.post_message(to_user_email, escape(data["message"]))
    return create_response(200, "Message successfully posted.", [])


def _is_post_message_data_valid(data):
    try:
        return bool(data["message"])
    except KeyError:
        return False


@app.route("/")
def main():
    path = os.path.join("client.html")
    return app.send_static_file(path)


@app.route("/<name>")
def static_resources(name):
    return send_from_directory(STATIC_FOLDER, name)


@app.errorhandler(400)
def bad_request(error):
    return create_response(400, error.message or "Your request is probably missing data.", [])


@app.errorhandler(UserNotValidError)
def user_not_valid(error):
    return create_response(400, error.message, [])


@app.errorhandler(CouldNotPostMessageError)
def could_not_post_message(error):
    return create_response(400, error.message, [])


@app.errorhandler(SessionNotValidError)
def session_not_valid(error=None):
    return create_response(401, "Session is not valid.", [])


@app.errorhandler(CouldNotLoginError)
def could_not_login(error):
    return create_response(401, error.message, [])


@app.errorhandler(ApiError)
def generic_error(error):
    return create_response(error.status_code, error.message, [])
