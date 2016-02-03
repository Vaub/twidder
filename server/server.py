from flask import Flask
app = Flask(__name__)

DATABASE = "database.db"


@app.route("/")
def hello():
    return "Hello World!"


@app.route("/signIn", methods=['POST'])
def sign_in(email, password):
    return "Hello {}, soon available :)"


if __name__ == "__main__":
    app.run()