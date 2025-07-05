# mongodb.py
from pymongo import MongoClient
from .mongo_config import MONGO_URL, MONGO_DB
import certifi

class MongoDBConnector:
    def __init__(self):
        self.client = MongoClient(
            MONGO_URL,
            tls=True,
            tlsCAFile=certifi.where()
        )
        self.db = self.client[MONGO_DB]

    def get_collection(self, name):
        return self.db[name]

    def get_flashcards_by_id(self,qr_id):
        collection = self.get_collection("flashcards")
        