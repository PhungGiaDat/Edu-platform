from database.mongodb import MongoDBConnector

class BaseRepository(MongoDBConnector):
    def __init__(self, collection_name: str):
        super().__init__()
        self.collection = self.get_collection(collection_name)
