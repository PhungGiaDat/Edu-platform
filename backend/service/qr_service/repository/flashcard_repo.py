from database.mongodb import MongoDBConnector
import os 
from database.base_repo import BaseRepository


class FlashcardRepository(BaseRepository):
    def __init__(self):
        super().__init__("flashcards")


    async def get_by_qr_id(self, qr_id: str):
        return await self.collection.find_one({"qr_id": qr_id})

    async def get_by_qr_id_and_ar_tag(self, qr_id: str, ar_tag: str):
        return await self.collection.find_one({"qr_id": qr_id, "ar_tag": ar_tag})

    