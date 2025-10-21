
from database.base_repo import BaseRepository

class ArObjectRepository(BaseRepository):
    def __init__(self):
        super().__init__("ar_objects")  # Không truyền db_name hay collection_name

    async def get_by_tag(self, ar_tag: str):
        result = await self.collection.find_one({"ar_tag": ar_tag})
        
        # Ép kiểu về str
        if result and "_id" in result:
            result["_id"] = str(result["_id"])
        return result

    async def get_by_qr_id(self, qr_id: str):
        """Get AR object by QR ID - needed for WebSocket service"""
        result = await self.collection.find_one({"qr_id": qr_id})
        
        # Ép kiểu về str
        if result and "_id" in result:
            result["_id"] = str(result["_id"])
        return result
            
        
