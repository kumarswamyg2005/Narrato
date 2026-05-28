import sqlite3
from backend.nlp import segment_chapter_text

def main():
    conn = sqlite3.connect("tmp/db.sqlite")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT raw_text FROM chapters WHERE book_id = '1cb03c39-0147-4f95-b16d-e63889694ada' AND chapter_num = 1")
    row = cursor.fetchone()
    if not row:
        print("No chapter found.")
        return
        
    text = row["raw_text"]
    voice_map = {"Narrator": "en-US-AndrewNeural"}
    segments = segment_chapter_text(text, voice_map)
    print("Number of segments:", len(segments))
    
    # Print the first few segments
    for i, seg in enumerate(segments[:10]):
        print(f"[{i}] {seg['type']} ({seg['speaker']}): {repr(seg['text'][:80])}")
        
    conn.close()

if __name__ == "__main__":
    main()
