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


class User(object):
    def __init__(self, email, password, first_name, family_name, gender, city, country):
        self.email = email
        self.password = password
        self.first_name = first_name
        self.family_name = family_name
        self.gender = gender
        self.city = city
        self.country = country


def _create_user_from_row(row):
    return User(**row)


class UserDoesNotExist(Exception):
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
        raise UserDoesNotExist


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
    return type(user) is User and (
        user.email and user.password and
        user.first_name and user.family_name and
        user.gender and user.city and user.country
    )
