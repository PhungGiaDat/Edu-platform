from database.mongodb import MongoDBConnector

class FlashcardRepository(MongoDBConnector):
    def __init__(self, db_name: str = "flashcards_db", collection_name: str = "flashcards"):
        super().__init__(db_name, collection_name)
        self.db_name = db_name
        self.collection_name = collection_name

    async def get_by_qr_id(self, qr_id: str):
        return await self.db[self.collection_name].find_one({"qr_id": qr_id})

    async def get_by_qr_id_and_ar_tag(self, qr_id: str, ar_tag: str):
        return await self.db[self.collection_name].find_one({"qr_id": qr_id, "ar_tag": ar_tag})

    