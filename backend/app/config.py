import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 3000))
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/uba_assistant")
JWT_SECRET = os.getenv("JWT_SECRET", "uba_secret")
