import sqlite3

def main():
    conn = sqlite3.connect("tmp/db.sqlite")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title, status, current_chapter, total_chapters FROM books")
    for row in cursor.fetchall():
        print(f"Book: {dict(row)}")
        
    cursor.execute("""
        SELECT chapter_num, title, status, audio_url, word_count 
        FROM chapters 
        WHERE book_id = '1cb03c39-0147-4f95-b16d-e63889694ada' 
        ORDER BY chapter_num ASC
    """)
    for row in cursor.fetchall():
        print(dict(row))
        
    conn.close()

if __name__ == "__main__":
    main()
