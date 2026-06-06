import base64
import os
import re

from dotenv import load_dotenv
from sarvamai import SarvamAI

from services.gpt_service import VOICE_MAX_WORDS, truncate_words

load_dotenv(override=True)

client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)

# Voice coach replies (~30 sec). Interview question playback can be longer.
TTS_VOICE_REPLY_WORDS = int(os.getenv("TTS_MAX_WORDS", str(VOICE_MAX_WORDS)))
TTS_QUESTION_WORDS = int(os.getenv("TTS_QUESTION_MAX_WORDS", "120"))


def _strip_markdown(text):
    text = re.sub(r"[*_#`]", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text.strip()


def text_to_speech(text, for_voice_reply=True):
    """
    for_voice_reply=True: cap at ~30 sec for AI answers.
    for_voice_reply=False: allow longer TTS (e.g. reading interview questions).
    """
    try:
        clean = _strip_markdown(text or "")
        word_limit = TTS_VOICE_REPLY_WORDS if for_voice_reply else TTS_QUESTION_WORDS
        clean = truncate_words(clean, word_limit)

        if not clean:
            return None

        response = client.text_to_speech.convert(
            text=clean,
            target_language_code="en-IN",
            speaker="shubh",
            model="bulbul:v3",
        )

        audio_base64 = "".join(response.audios)
        audio_bytes = base64.b64decode(audio_base64)

        output_file = "uploads/ai_response.wav"
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        with open(output_file, "wb") as f:
            f.write(audio_bytes)

        return output_file

    except Exception as e:
        print("TTS ERROR:", e)
        return None
