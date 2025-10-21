from database.base_repo import BaseRepository
from typing import List

class ArCombinationRepository(BaseRepository):
    """Repository for managing AR combinations (multi-card contexts)."""
    
    def __init__(self):
        # Initialize with the 'ar_combinations' collection name
        super().__init__("ar_combinations")

    async def find_by_tag(self, ar_tag: str) -> List[dict]:
        """
        Finds all combinations that include a specific ar_tag in their 
        'required_tags' list.
        
        Args:
            ar_tag: The tag of the single flashcard that is currently visible.

        Returns:
            A list of combination documents that are now possible.
        """
        # The query finds documents where the 'required_tags' array contains the ar_tag.

        cursor = self.collection.find({"required_tags": ar_tag})
        results = await cursor.to_list(length=None)
        
        # **FIX: Luôn chuyển đổi _id sang string cho mỗi item trong list**
        for item in results:
            if "_id" in item:
                item["_id"] = str(item["_id"])
        
        return results