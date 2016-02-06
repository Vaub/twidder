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

INSERT_MESSAGE = "INSERT INTO posts(to_user, from_user, content) VALUES (?, ?, ?)"


def _create_user_from_row(row):
    return row


class UserDoesNotExist(Exception):
    def __init__(self): pass


class CouldNotCreateSessionError(Exception):
    def __init__(self): pass


class CouldNotDeleteSession(Exception):
    def __init__(self): pass


class SessionDoesNotExistError(Exception):
    def __init__(self): pass


def connect_db(filename):
    g.db = sqlite3.connect(filename)
    g.db.row_factory = sqlite3.Row


def close_db():
    g.db.close()


def select_user(email):
    conn = g.db
    try:
        user = conn.execute(SELECT_USER, (email,)).fetchone()
        if not user:
            raise UserDoesNotExist()

        return _create_user_from_row(user)
    except sqlite3.Error:
        raise UserDoesNotExist()


def persist_user(user):
    if not _is_user_valid(user):
        return False

    conn = g.db
    try:
        conn.execute(UPDATE_USER, (user.password, user.first_name, user.family_name,
                                   user.gender, user.city, user.country, user.email))
        conn.execute(INSERT_USER, (user.email, user.password, user.first_name, user.family_name,
                                   user.gender, user.city, user.country))
        conn.commit()
    except sqlite3.Error:
        return False

    return True


def _is_user_valid(user):
    try:
        return (
            user.email and user.password and
            user.first_name and user.family_name and
            user.gender and user.city and user.country
        )
    except AttributeError:
        return False


def persist_session(email, token):
    conn = g.db
    try:
        conn.execute(UPDATE_SESSION, (token, email))
        conn.execute(INSERT_SESSION, (email, token))
        conn.commit()
    except sqlite3.Error as e:
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


class CouldNotInsertMessage(Exception):
    pass


def insert_message(to_user_email, from_user_email, message):
    conn = g.db
    try:
        conn.execute(INSERT_MESSAGE, (to_user_email, from_user_email, message,))
        conn.commit()
    except sqlite3.Error:
        raise CouldNotInsertMessage()
