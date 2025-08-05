
from database.base_repo import BaseRepository

class Ar_object_repository(BaseRepository):
    def __init__(self):
        super().__init__("ar_objects")  # Không truyền db_name hay collection_name

    async def get_by_tag(self, ar_tag: str):
        result = await self.collection.find_one({"ar_tag": ar_tag})
        
        # Ép kiểu về str
        if result and "_id" in result:
            result["_id"] = str(result["_id"])
        return result
            
        
