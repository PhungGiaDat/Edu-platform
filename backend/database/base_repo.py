from database.db import mongo_connector

class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection = mongo_connector.get_collection(collection_name)