import os
import re
import uuid
import base64
import traceback

import werkzeug.security as security
from geventwebsocket import WebSocketError
from flask import json, request, escape, abort, send_from_directory, render_template

from . import app, sockets, STATIC_FOLDER, MEDIA_FOLDER, ALLOWED_MEDIA
from security import validate_request, CouldNotValidateRequestError
import database_helper as db

SESSION_TOKEN = "X-Session-Token"

COULD_NOT_POST_MESSAGE = "Could not post message."

CONFIG = {
    "database": "database/database.db",
    "database_schema": "database/database.schema",
    "min_password_length": 6
}

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

    @staticmethod
    def does_session_exist(token):
        try:
            Session.find_session(token)
            return True
        except SessionNotValidError:
            return False

    @staticmethod
    def get_user(token):
        try:
            return Session.find_session(token).user
        except SessionNotValidError:
            print("Session {} did not exists".format(token))
            return False


class Post(object):
    def __init__(self, to_user, from_user, content, media, date_posted):
        self.date_posted = date_posted
        self.content = content
        self.from_user = from_user
        self.to_user = to_user
        self.media = media


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

        if not is_email_valid(self.email):
            raise UserNotValidError("Email is not valid.")

    def check_password(self, password):
        return security.check_password_hash(self.password, password)

    def get_messages(self):
        messages = db.select_messages(self.email)
        return [Post(**m) for m in messages]

    def get_number_of_messages(self):
        return len(self.get_messages())

    def post_message(self, to_user_email, message, media_file):
        if not (to_user_email and (message or media_file)):
            raise CouldNotPostMessageError(COULD_NOT_POST_MESSAGE)

        try:
            User.find_user(to_user_email)
        except UserNotValidError:
            raise CouldNotPostMessageError(COULD_NOT_POST_MESSAGE)

        try:
            media = None
            if media_file:
                m = Media(to_user_email)
                m.post_media(media_file)
                media = m.name

            db.insert_message(to_user_email, self.email, message=message, media=media)
        except CouldNotPostMediaError, db.CouldNotInsertMessage:
            raise CouldNotPostMessageError(COULD_NOT_POST_MESSAGE)

    def persist(self):
        if not db.persist_user(self.__dict__):
            raise Exception("User could not be persisted???")

    def get_number_views(self):
        return db.select_page_views(self.email)

    def update_number_views(self):
        db.persist_page_views(self.email)

    def __eq__(self, other):
        if isinstance(other, User):
            return self.email == other.email

    def __hash__(self):
        return self.email.__hash__()

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


def is_email_valid(email):
    return email and re.match(r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)", email)


class CouldNotFindMediaError(Exception):
    pass


class CouldNotPostMediaError(Exception):
    pass


class Media:
    def __init__(self, user, name=None, date_posted=None):
        self.name = name or str(uuid.uuid4())
        self.user = User.find_user(user).email

    def post_media(self, to_persist):
        if not Media._allowed_media(to_persist.filename):
            raise CouldNotPostMediaError()

        self.name = self.name + "." + Media._extract_extension(to_persist.filename)
        try:
            db.insert_media(self.user, self.name)
            to_persist.save(os.path.join(MEDIA_FOLDER, self.name))
        except db.CouldNotInsertMedia:
            raise CouldNotPostMediaError()

    @staticmethod
    def _allowed_media(filename):
        return "." in filename and Media._extract_extension(filename) in ALLOWED_MEDIA

    @staticmethod
    def _extract_extension(filename):
        return filename.rsplit(".", 1)[1]

    @staticmethod
    def find_media(name):
        try:
            media_data = db.select_media(name)
            return Media(**media_data)
        except db.MediaDoesNotExists:
            raise CouldNotFindMediaError()


def identify_session():
    try:
        token = request.headers[SESSION_TOKEN]
        return Session.find_session(token)
    except KeyError:
        raise SessionNotValidError()


def create_response(status_code, message, data):
    content = {"status_code": status_code, "message": message, "data": data}
    response = json.jsonify(content)
    response.status_code = status_code

    return response


@app.before_request
def before_request():
    db.connect_db(CONFIG["database"])


@app.route("/api/register", methods=["POST"])
@validate_request
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
        try:
            user = User(**parsed_data)
        except TypeError:
            raise UserNotValidError()
        
        return user
    except KeyError:
        raise UserNotValidError()


@app.route("/api/login", methods=['POST'])
@validate_request
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


@app.route("/api/logout", methods=["POST"])
@validate_request
def logout():
    identify_session().close()
    return create_response(200, "Logout successful.", [])


@app.route("/api/changePassword", methods=["PUT"])
@validate_request
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


@app.route("/api/profile", methods=["GET"])
@validate_request
def get_user_data_by_token():
    user = identify_session().user
    return create_response(200, "Data successfully retrieved.", _create_user_info(user))


@app.route("/api/profile/<email>", methods=["GET"])
@validate_request
def get_user_data_by_email(email):
    identify_session()
    other_user = User.find_user(email)

    other_user.update_number_views()
    send_statistics()

    return create_response(200, "Data successfully retrieved.", _create_user_info(other_user))


def _create_user_info(user):
    return {"email": user.email, "first_name": user.first_name, "family_name": user.family_name,
            "gender": user.gender, "city": user.city, "country": user.country}


@app.route("/api/messages", methods=["GET"])
@validate_request
def get_user_messages_by_token():
    user = identify_session().user
    messages = [m.__dict__ for m in user.get_messages()]
    return create_response(200, "Messages successfully retrieved.", messages)


@validate_request
@app.route("/api/messages/<email>", methods=["GET"])
def get_user_messages_by_email(email):
    identify_session()
    other_user = User.find_user(email)

    messages = [m.__dict__ for m in other_user.get_messages()]
    return create_response(200, "Messages successfully retrieved.", messages)


@app.route("/api/messages/<to_user_email>", methods=["POST"])
@validate_request
def post_message(to_user_email):
    user = identify_session().user

    message = request.form.get("message", "")
    media = request.files.get("media", None)

    user.post_message(to_user_email, escape(message), media)
    send_statistics()
    return create_response(200, "Message successfully posted.", [])


def _is_post_message_data_valid(data):
    try:
        return bool(data["message"])
    except KeyError:
        return False


@app.route("/api/<name>")
def api_404(name):
    return create_response(404, "API endpoint not found.", [])

@app.route("/media/<name>")
def get_user_media(name):
    return send_from_directory(MEDIA_FOLDER, Media.find_media(name).name)


def get_client_secret():
    return base64.standard_b64encode(app.config["SECRET_KEY"].encode("hex"))


@app.route("/")
def main():
    return render_template("client.html", client_secret=get_client_secret())


@app.route("/templates/<filename>")
def static_templates(filename):
    folder = os.path.join(STATIC_FOLDER, "templates")
    return send_from_directory(folder, filename)


@app.route("/js/<filename>")
def static_js(filename):
    folder = os.path.join(STATIC_FOLDER, "js")
    return send_from_directory(folder, filename)


@app.route("/css/<filename>")
def static_css(filename):
    folder = os.path.join(STATIC_FOLDER, "css")
    return send_from_directory(folder, filename)


@app.route("/images/<filename>")
def static_images(filename):
    folder = os.path.join(STATIC_FOLDER, "images")
    return send_from_directory(folder, filename)


bower_components_path = [
    "handlebars",
    "Chart.js",
    "bootstrap",
    "page",
    "sjcl"
]


@app.route("/bower_components/<name>/<filename>")
def static_bower(name, filename):
    if name not in bower_components_path:
        abort(404)

    directory = os.path.join(STATIC_FOLDER, "bower_components", name)
    return send_from_directory(directory, filename)


@app.errorhandler(400)
def bad_request(error):
    return create_response(400, error.message or "Your request is probably missing data.", [])


@app.errorhandler(404)
def default_dump(error):
    return render_template("client.html", client_secret=get_client_secret())


@app.errorhandler(CouldNotValidateRequestError)
def could_not_validate_request(error):
    return create_response(401, "Could not validate the request.", [])


@app.errorhandler(500)
def internal_error(error):
    traceback.print_exc()
    return create_response(500, "Internal server error.", [])


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


@app.errorhandler(CouldNotFindMediaError)
def media_error(error):
    return create_response(404, "Could not find media!", [])


connected_socket = {}


@sockets.route("/messages")
def ws_messages(ws):
    before_request()

    try:
        _websocket_connection(ws)
    except WebSocketError as e:
        print("Error in WS: {}".format(e))


def _websocket_connection(ws):
    token = None
    while not ws.closed:
        if token and not Session.does_session_exist(token):
            ws.close()

        message = None
        try:
            message = ws.receive()
        except WebSocketError:
            continue

        if not message:
            continue

        content = json.loads(message)
        content_type = content["type"]

        if content_type == "authenticate":
            token = content["data"]
            if not _authenticate_user(token, ws):
                ws.close()
            send_statistics()
        if content_type == "statistics":
            send_statistics()
        else:
            pass

    pop_user(token)
    send_statistics()


def _authenticate_user(token, ws):
    user = pop_user(token)
    if not user:
        return False

    connected_socket[user] = ws
    return True


def pop_user(token):
    user = Session.get_user(token)
    if not user:
        return False

    connected_socket.pop(user).close() if user in connected_socket else None
    return user


def send_statistics():
    statistic = {
        "nb_connected_users": len(connected_socket)
    }

    for k in connected_socket:
        statistic["nb_posts"] = k.get_number_of_messages()
        statistic["nb_views"] = k.get_number_views()
        connected_socket[k].send(json.dumps({"type": "statistics", "data": statistic}))
