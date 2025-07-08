# mongodb.py
import motor.motor_asyncio
from pymongo import MongoClient
from .mongo_config import MONGO_URL, MONGO_DB
import certifi

class MongoDBConnector:
    def __init__(self):
        self.client = motor.motor_asyncio.AsyncIOMotorClient(
            MONGO_URL,
            tls=True,
            tlsCAFile=certifi.where()
        )
        self.db = self.client[MONGO_DB]
        print(f"[DEBUG] 🗄️ Connected to MongoDB ")
        

    def get_collection(self, collection_name):
        return self.db[collection_name]
    
    async def close_connection(self):
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
        else:
            print("No active MongoDB connection to close.")

