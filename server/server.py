from flask import Flask

app = Flask(__name__)

DATABASE = "database.db"


class User(object):
    def __init__(self, email, password, first_name, family_name, gender, city, country):
        self.email = email
        self.password = password
        self.first_name = first_name
        self.family_name = family_name
        self.gender = gender
        self.city = city


@app.route("/")
def hello():
    return "Hello World!"


@app.route("/signIn", methods=['POST'])
def sign_in(email, password):
    return "Hello {}, soon available :)"


if __name__ == "__main__":
    app.run()
