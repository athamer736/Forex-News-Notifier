from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    # For local dev, you can run directly like: python app.py
    app.run(debug=True)
