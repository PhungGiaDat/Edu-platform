import sqlite3 

conn = sqlite3.connect('yolo.db')
c = conn.cursor()


c.execute("""
CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY,
    qr_code TEXT,
    word TEXT
)
""")


c.execute("INSERT INTO flashcards (qr_code, word) VALUES (?, ?)", ("CARD-ELEPHANT-001", "ELEPHANT"))
conn.commit()
conn.close()