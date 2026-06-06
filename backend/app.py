import os
import re

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from routes.interview_routes import interview_bp
from routes.resume_routes import resume_bp
from services.gpt_service import check_gemini_health, get_active_model

load_dotenv(override=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
cors_origins.append(re.compile(r"https://[\w.-]+\.vercel\.app"))

CORS(app, origins=cors_origins, supports_credentials=True)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.register_blueprint(resume_bp, url_prefix="/api")
app.register_blueprint(interview_bp, url_prefix="/api")


@app.route("/")
def home():
    return jsonify({"message": "AI Interview Coach Backend Running"})


@app.route("/health")
def health():
    gemini = check_gemini_health()
    return jsonify({
        "status": "ok" if gemini.get("ok") else "degraded",
        "version": "2.0",
        "gemini": gemini,
        "sarvam_configured": bool(os.getenv("SARVAM_API_KEY")),
        "model": get_active_model(),
        "env_model": os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest"),
    })


@app.errorhandler(413)
def too_large(_e):
    return jsonify({"error": "File too large (max 16 MB)"}), 413


@app.errorhandler(RuntimeError)
def ai_runtime_error(e):
    return jsonify({"error": str(e)}), 503


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=False)
