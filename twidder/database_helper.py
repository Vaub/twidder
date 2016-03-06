import sqlite3
from flask import g

SCHEMA_FILE = "database.schema"

SELECT_USER = (
    "SELECT * FROM users WHERE email = ?"
)

UPDATE_USER = (
    "UPDATE users SET "
    " password = ?, first_name = ?, family_name = ?, gender = ?, city = ?, country = ?"
    "WHERE "
    "  email = ?"
)

INSERT_USER = (
    "INSERT OR IGNORE INTO "
    "  users(email, password, first_name, family_name, gender, city, country) "
    "VALUES "
    "  (?, ?, ?, ?, ?, ?, ?)"
)

SELECT_SESSION = "SELECT * FROM sessions WHERE token = ?"

UPDATE_SESSION = "UPDATE sessions SET token = ? WHERE user = ?"

INSERT_SESSION = "INSERT OR IGNORE INTO sessions(user, token) VALUES (?, ?)"

DELETE_SESSION = "DELETE FROM sessions WHERE token = ?"

SELECT_MESSAGES = "SELECT * FROM posts WHERE to_user = ? ORDER BY date_posted DESC"

INSERT_MESSAGE = "INSERT INTO posts(to_user, from_user, content) VALUES (?, ?, ?)"

SELECT_PAGE_VIEWS = "SELECT * FROM page_views WHERE user = ?"

INSERT_PAGE_VIEWS = "INSERT OR IGNORE INTO page_views(user) VALUES (?)"

UPDATE_PAGE_VIEWS = "UPDATE page_views SET number_views = number_views+1 WHERE user = ?"


class UserDoesNotExist(Exception):
    def __init__(self): pass


class CouldNotCreateSessionError(Exception):
    def __init__(self): pass


class CouldNotDeleteSession(Exception):
    def __init__(self): pass


class SessionDoesNotExistError(Exception):
    def __init__(self): pass


class CouldNotFindMessages(Exception):
    def __init__(self): pass


def connect_db(filename):
    g.db = sqlite3.connect(filename)
    g.db.row_factory = sqlite3.Row


def close_db():
    try:
        g.db.close()
    except Exception as e:
        print(e)


def init_database(db_filename, schema_filename):
    with open(schema_filename, "r") as schema:
        with sqlite3.connect(db_filename) as db:
            query = schema.read()
            db.executescript(query)
            db.commit()


def select_user(email):
    conn = g.db
    try:
        user = conn.execute(SELECT_USER, (email,)).fetchone()
        if not user:
            raise UserDoesNotExist()

        return user
    except sqlite3.Error:
        raise UserDoesNotExist()


def persist_user(user_data):
    if not _is_user_valid(user_data):
        return False

    conn = g.db
    try:
        conn.execute(UPDATE_USER, (user_data["password"], user_data["first_name"], user_data["family_name"], user_data["gender"], user_data["city"], user_data["country"], user_data["email"],))
        conn.execute(INSERT_USER, (user_data["email"], user_data["password"], user_data["first_name"], user_data["family_name"], user_data["gender"], user_data["city"], user_data["country"],))
        conn.commit()
    except sqlite3.Error:
        return False

    return True


def _is_user_valid(user_data):
    try:
        return (
            user_data["email"] and user_data["password"] and
            user_data["first_name"] and user_data["family_name"] and
            user_data["gender"] and user_data["city"] and user_data["country"]
        )
    except AttributeError:
        return False


def persist_session(email, token):
    conn = g.db
    try:
        conn.execute(UPDATE_SESSION, (token, email))
        conn.execute(INSERT_SESSION, (email, token))
        conn.commit()
    except sqlite3.Error:
        raise CouldNotCreateSessionError()


def select_session(token):
    conn = g.db
    try:
        session = conn.execute(SELECT_SESSION, (token,)).fetchone()
        if not session:
            raise SessionDoesNotExistError()

        return session["user"]
    except sqlite3.Error:
        raise SessionDoesNotExistError()


def delete_session(token):
    conn = g.db
    try:
        conn.execute(DELETE_SESSION, (token,))
        conn.commit()
    except sqlite3.Error:
        raise CouldNotDeleteSession()


def select_messages(email):
    conn = g.db
    try:
        messages = conn.execute(SELECT_MESSAGES, (email,)).fetchall()
        return messages
    except sqlite3.Error:
        raise CouldNotFindMessages()


class CouldNotInsertMessage(Exception):
    pass


def insert_message(to_user_email, from_user_email, message):
    conn = g.db
    try:
        conn.execute(INSERT_MESSAGE, (to_user_email, from_user_email, message,))
        conn.commit()
    except sqlite3.Error:
        raise CouldNotInsertMessage()


class CouldNotFindPageView(Exception):
    pass


def select_page_views(email):
    conn = g.db
    try:
        number_of_views = conn.execute(SELECT_PAGE_VIEWS, (email,)).fetchone()
        return number_of_views["number_views"] if number_of_views else 0
    except sqlite3.Error:
        raise CouldNotFindPageView()


def persist_page_views(email):
    conn = g.db
    try:
        conn.execute(INSERT_PAGE_VIEWS, (email,))
        conn.execute(UPDATE_PAGE_VIEWS, (email,))
        conn.commit()
    except sqlite3.Error:
        raise CouldNotFindPageView()