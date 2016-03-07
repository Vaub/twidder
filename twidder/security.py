import datetime
import base64, hmac, hashlib
from flask import request

from . import app


class MessageHasher(object):
    def __init__(self, key, hash_algorithm=hashlib.sha256):
        self.key = key
        self.hash_algorithm = hash_algorithm

    def digest_message(self, *messages):
        generator = hmac.HMAC(self.key, digestmod=self.hash_algorithm)
        for message in messages:
            generator.update(message)

        return generator.hexdigest()

    def is_message_valid(self, digest, *messages):
        to_compare = self.digest_message(*messages)
        return hmac.compare_digest(to_compare, digest)


class CouldNotValidateRequestError(Exception):
    pass


def _validate_request(hasher):
    try:
        digest = base64.standard_b64decode(request.headers["X-Request-Hmac"] or "")
        timestamp = int(request.headers["X-Request-Timestamp"])
        time_sent = datetime.datetime.utcfromtimestamp(timestamp)
    except KeyError:
        raise CouldNotValidateRequestError()

    session_token = (request.headers["X-Session-Token"]
                     if "X-Session-Token" in request.headers else None)

    if datetime.datetime.utcnow() - time_sent > datetime.timedelta(minutes=2):
        raise CouldNotValidateRequestError()

    message = str(request.get_data() or "")
    if not hasher.is_message_valid(digest, str(timestamp), session_token, message):
        raise CouldNotValidateRequestError()


def validate_request(f):
    def decorator():
        message_hasher = MessageHasher(app.config["SECRET_KEY"])
        _validate_request(message_hasher)
        return f()
    return decorator

