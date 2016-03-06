import base64, hmac, hashlib
from flask import request

from . import app


class MessageHasher(object):
    def __init__(self, key, hash_algorithm=hashlib.sha256):
        self.key = key
        self.hash_algorithm = hash_algorithm

    def digest_message(self, message):
        return hmac.HMAC(self.key, msg=message, digestmod=self.hash_algorithm).hexdigest()

    def is_message_valid(self, message, digest):
        to_compare = self.digest_message(message)
        return hmac.compare_digest(to_compare, digest)


class CouldNotValidateRequestError(Exception):
    pass


def _validate_request(hasher):
    try:
        digest = base64.standard_b64decode(request.headers["X-Request-Digest"] or "")
    except KeyError:
        raise CouldNotValidateRequestError()

    message = str(request.get_data() or "")
    if not hasher.is_message_valid(message, digest):
        raise CouldNotValidateRequestError()


def validate_request(f):
    def decorator():
        message_hasher = MessageHasher(app.config["SECRET_KEY"])
        _validate_request(message_hasher)
        return f()
    return decorator

