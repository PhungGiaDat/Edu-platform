
try:
    from models.user_mongo import UserDocument
    print("SUCCESS: UserDocument imported successfully!")
except ImportError as e:
    print(f"FAILURE: ImportError: {e}")
except Exception as e:
    print(f"FAILURE: An unexpected error occurred: {e}")
