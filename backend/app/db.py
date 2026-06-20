from motor.motor_asyncio import AsyncIOMotorClient
from app import config
import logging

logger = logging.getLogger("uvicorn.error")

import certifi
from pymongo.errors import ConfigurationError

client = AsyncIOMotorClient(config.MONGO_URI, tlsCAFile=certifi.where())
# Get the database from default source, or fallback to 'uba_assistant'
try:
    db = client.get_default_database()
except ConfigurationError:
    db = client.get_database("uba_assistant")

async def init_db():
    try:
        # Create unique index on email
        await db.users.create_index("email", unique=True)
        # Create compound index on history for fast user + domain queries
        await db.history.create_index([("userId", 1), ("domain", 1), ("timestamp", -1)])
        logger.info("✅ Connected to MongoDB and indexes created/verified")
    except Exception as e:
        logger.error(f"❌ MongoDB connection error: {e}")
        raise e
