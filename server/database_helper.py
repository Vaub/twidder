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


def connect_db(filename):
    g.db = sqlite3.connect(filename)
    g.db.row_factory = sqlite3.Row


def close_db():
    g.db.close()


def select_user(email):
    if not email:
        return {}

    c = g.db
    c.execute(SELECT_USER, email)
    return c.fetchone()


def persist_user(user):
    if is_user_valid(user):
        return False

    conn = g.db
    conn.execute(UPDATE_USER,
                 (user.password, user.first_name, user.family_name, user.gender, user.city, user.country, user.email,))
    conn.execute(INSERT_USER,
                 (user.email, user.password, user.first_name, user.family_name, user.gender, user.city, user.country,))
    conn.commit()
    return True


def is_user_valid(user):
    if not user:
        return False

    try:
        return (user.email and user.password and
                user.first_name and user.family_name and
                user.gender and user.city and user.country)
    except AttributeError:
        return False
