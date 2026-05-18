import os
import uuid
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime

class DatabaseInterface:
    def get_books(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError()

    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()

    def create_book(self, title: str, author: str, file_type: str, total_chapters: int, status: str, 
                    cover_url: Optional[str] = None, total_words: int = 0, estimated_audio_hours: float = 0.0, 
                    user_id: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError()

    def update_book(self, book_id: str, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError()

    def get_chapters(self, book_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError()

    def get_chapter(self, chapter_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()

    def create_chapter(self, book_id: str, chapter_num: int, title: str, status: str, word_count: int = 0) -> Dict[str, Any]:
        raise NotImplementedError()

    def update_chapter(self, chapter_id: str, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError()

    def get_character_voices(self, book_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError()

    def create_character_voice(self, book_id: str, character_name: str, edge_tts_voice: str, gender: str, line_count: int = 0) -> Dict[str, Any]:
        raise NotImplementedError()

    def update_character_voice(self, book_id: str, character_name: str, edge_tts_voice: str) -> Dict[str, Any]:
        raise NotImplementedError()

    def delete_character_voices(self, book_id: str) -> None:
        raise NotImplementedError()

    def delete_book(self, book_id: str) -> None:
        raise NotImplementedError()

    def save_progress(self, user_id: str, book_id: str, chapter_id: str, position_ms: float, word_index: int) -> Dict[str, Any]:
        raise NotImplementedError()

    def get_progress(self, user_id: str, book_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()


class SQLiteDatabase(DatabaseInterface):
    def __init__(self, db_path: str = "./tmp/db.sqlite"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS books (
              id TEXT PRIMARY KEY,
              user_id TEXT,
              title TEXT,
              author TEXT,
              file_type TEXT,
              total_chapters INTEGER,
              total_words INTEGER,
              estimated_audio_hours REAL,
              status TEXT,
              current_chapter INTEGER DEFAULT 0,
              cover_url TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")
            
            conn.execute("""
            CREATE TABLE IF NOT EXISTS chapters (
              id TEXT PRIMARY KEY,
              book_id TEXT,
              chapter_num INTEGER,
              title TEXT,
              raw_text TEXT,
              word_count INTEGER,
              audio_url TEXT,
              timestamps_url TEXT,
              duration_seconds REAL,
              status TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(book_id) REFERENCES books(id)
            )""")
            
            conn.execute("""
            CREATE TABLE IF NOT EXISTS character_voices (
              id TEXT PRIMARY KEY,
              book_id TEXT,
              character_name TEXT,
              edge_tts_voice TEXT,
              gender TEXT,
              line_count INTEGER,
              FOREIGN KEY(book_id) REFERENCES books(id)
            )""")
            
            conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
              id TEXT PRIMARY KEY,
              user_id TEXT,
              book_id TEXT,
              chapter_id TEXT,
              position_ms REAL,
              word_index INTEGER,
              last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(book_id) REFERENCES books(id),
              FOREIGN KEY(chapter_id) REFERENCES chapters(id)
            )""")
            conn.commit()

    def get_books(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM books ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def create_book(self, title: str, author: str, file_type: str, total_chapters: int, status: str, 
                    cover_url: Optional[str] = None, total_words: int = 0, estimated_audio_hours: float = 0.0, 
                    user_id: Optional[str] = None) -> Dict[str, Any]:
        book_id = str(uuid.uuid4())
        user_id = user_id or "default-user"
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO books (id, user_id, title, author, file_type, total_chapters, total_words, estimated_audio_hours, status, cover_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (book_id, user_id, title, author, file_type, total_chapters, total_words, estimated_audio_hours, status, cover_url))
            conn.commit()
        return self.get_book(book_id)

    def update_book(self, book_id: str, **kwargs) -> Dict[str, Any]:
        if not kwargs:
            return self.get_book(book_id)
        
        columns = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [book_id]
        
        with self._get_conn() as conn:
            conn.execute(f"UPDATE books SET {columns} WHERE id = ?", values)
            conn.commit()
        return self.get_book(book_id)

    def get_chapters(self, book_id: str) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_num ASC", (book_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_chapter(self, chapter_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def create_chapter(self, book_id: str, chapter_num: int, title: str, status: str, word_count: int = 0) -> Dict[str, Any]:
        chapter_id = str(uuid.uuid4())
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO chapters (id, book_id, chapter_num, title, word_count, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (chapter_id, book_id, chapter_num, title, word_count, status))
            conn.commit()
        return self.get_chapter(chapter_id)

    def update_chapter(self, chapter_id: str, **kwargs) -> Dict[str, Any]:
        if not kwargs:
            return self.get_chapter(chapter_id)
        
        columns = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [chapter_id]
        
        with self._get_conn() as conn:
            conn.execute(f"UPDATE chapters SET {columns} WHERE id = ?", values)
            conn.commit()
        return self.get_chapter(chapter_id)

    def get_character_voices(self, book_id: str) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM character_voices WHERE book_id = ? ORDER BY line_count DESC", (book_id,))
            return [dict(row) for row in cursor.fetchall()]

    def create_character_voice(self, book_id: str, character_name: str, edge_tts_voice: str, gender: str, line_count: int = 0) -> Dict[str, Any]:
        cv_id = str(uuid.uuid4())
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO character_voices (id, book_id, character_name, edge_tts_voice, gender, line_count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cv_id, book_id, character_name, edge_tts_voice, gender, line_count))
            conn.commit()
        return {"id": cv_id, "book_id": book_id, "character_name": character_name, "edge_tts_voice": edge_tts_voice, "gender": gender, "line_count": line_count}

    def update_character_voice(self, book_id: str, character_name: str, edge_tts_voice: str) -> Dict[str, Any]:
        with self._get_conn() as conn:
            conn.execute("""
                UPDATE character_voices SET edge_tts_voice = ? WHERE book_id = ? AND character_name = ?
            """, (edge_tts_voice, book_id, character_name))
            conn.commit()
        return {"book_id": book_id, "character_name": character_name, "edge_tts_voice": edge_tts_voice}

    def delete_character_voices(self, book_id: str) -> None:
        with self._get_conn() as conn:
            conn.execute("DELETE FROM character_voices WHERE book_id = ?", (book_id,))
            conn.commit()

    def delete_book(self, book_id: str) -> None:
        with self._get_conn() as conn:
            conn.execute("DELETE FROM user_progress WHERE book_id = ?", (book_id,))
            conn.execute("DELETE FROM character_voices WHERE book_id = ?", (book_id,))
            conn.execute("DELETE FROM chapters WHERE book_id = ?", (book_id,))
            conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
            conn.commit()

    def save_progress(self, user_id: str, book_id: str, chapter_id: str, position_ms: float, word_index: int) -> Dict[str, Any]:
        progress_id = str(uuid.uuid4())
        user_id = user_id or "default-user"
        with self._get_conn() as conn:
            # Check if progress exists
            cursor = conn.execute("SELECT id FROM user_progress WHERE user_id = ? AND book_id = ?", (user_id, book_id))
            row = cursor.fetchone()
            if row:
                conn.execute("""
                    UPDATE user_progress 
                    SET chapter_id = ?, position_ms = ?, word_index = ?, last_played = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (chapter_id, position_ms, word_index, row['id']))
                progress_id = row['id']
            else:
                conn.execute("""
                    INSERT INTO user_progress (id, user_id, book_id, chapter_id, position_ms, word_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (progress_id, user_id, book_id, chapter_id, position_ms, word_index))
            conn.commit()
        return {"id": progress_id, "user_id": user_id, "book_id": book_id, "chapter_id": chapter_id, "position_ms": position_ms, "word_index": word_index}

    def get_progress(self, user_id: str, book_id: str) -> Optional[Dict[str, Any]]:
        user_id = user_id or "default-user"
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM user_progress WHERE user_id = ? AND book_id = ?", (user_id, book_id))
            row = cursor.fetchone()
            return dict(row) if row else None


class SupabaseDatabase(DatabaseInterface):
    def __init__(self, url: str, key: str):
        from supabase import create_client, Client
        self.client: Client = create_client(url, key)

    def get_books(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.client.table("books").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("created_at", desc=True).execute()
        return response.data

    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        response = self.client.table("books").select("*").eq("id", book_id).execute()
        return response.data[0] if response.data else None

    def create_book(self, title: str, author: str, file_type: str, total_chapters: int, status: str, 
                    cover_url: Optional[str] = None, total_words: int = 0, estimated_audio_hours: float = 0.0, 
                    user_id: Optional[str] = None) -> Dict[str, Any]:
        data = {
            "title": title,
            "author": author,
            "file_type": file_type,
            "total_chapters": total_chapters,
            "total_words": total_words,
            "estimated_audio_hours": estimated_audio_hours,
            "status": status,
            "cover_url": cover_url
        }
        if user_id:
            data["user_id"] = user_id
        response = self.client.table("books").insert(data).execute()
        return response.data[0]

    def update_book(self, book_id: str, **kwargs) -> Dict[str, Any]:
        response = self.client.table("books").update(kwargs).eq("id", book_id).execute()
        return response.data[0]

    def get_chapters(self, book_id: str) -> List[Dict[str, Any]]:
        response = self.client.table("chapters").select("*").eq("book_id", book_id).order("chapter_num", desc=False).execute()
        return response.data

    def get_chapter(self, chapter_id: str) -> Optional[Dict[str, Any]]:
        response = self.client.table("chapters").select("*").eq("id", chapter_id).execute()
        return response.data[0] if response.data else None

    def create_chapter(self, book_id: str, chapter_num: int, title: str, status: str, word_count: int = 0) -> Dict[str, Any]:
        data = {
            "book_id": book_id,
            "chapter_num": chapter_num,
            "title": title,
            "status": status,
            "word_count": word_count
        }
        response = self.client.table("chapters").insert(data).execute()
        return response.data[0]

    def update_chapter(self, chapter_id: str, **kwargs) -> Dict[str, Any]:
        response = self.client.table("chapters").update(kwargs).eq("id", chapter_id).execute()
        return response.data[0]

    def get_character_voices(self, book_id: str) -> List[Dict[str, Any]]:
        response = self.client.table("character_voices").select("*").eq("book_id", book_id).order("line_count", desc=True).execute()
        return response.data

    def create_character_voice(self, book_id: str, character_name: str, edge_tts_voice: str, gender: str, line_count: int = 0) -> Dict[str, Any]:
        data = {
            "book_id": book_id,
            "character_name": character_name,
            "edge_tts_voice": edge_tts_voice,
            "gender": gender,
            "line_count": line_count
        }
        response = self.client.table("character_voices").insert(data).execute()
        return response.data[0]

    def update_character_voice(self, book_id: str, character_name: str, edge_tts_voice: str) -> Dict[str, Any]:
        response = self.client.table("character_voices").update({"edge_tts_voice": edge_tts_voice}).eq("book_id", book_id).eq("character_name", character_name).execute()
        return response.data[0] if response.data else {"book_id": book_id, "character_name": character_name, "edge_tts_voice": edge_tts_voice}

    def delete_character_voices(self, book_id: str) -> None:
        self.client.table("character_voices").delete().eq("book_id", book_id).execute()

    def save_progress(self, user_id: str, book_id: str, chapter_id: str, position_ms: float, word_index: int) -> Dict[str, Any]:
        user_id = user_id or "default-user"
        # Upsert user progress
        # Supabase syntax for upsert needs unique constraint. 
        # Check first
        response = self.client.table("user_progress").select("id").eq("user_id", user_id).eq("book_id", book_id).execute()
        data = {
            "user_id": user_id,
            "book_id": book_id,
            "chapter_id": chapter_id,
            "position_ms": position_ms,
            "word_index": word_index,
            "last_played": datetime.utcnow().isoformat()
        }
        if response.data:
            prog_id = response.data[0]["id"]
            res = self.client.table("user_progress").update(data).eq("id", prog_id).execute()
        else:
            res = self.client.table("user_progress").insert(data).execute()
        return res.data[0]

    def get_progress(self, user_id: str, book_id: str) -> Optional[Dict[str, Any]]:
        user_id = user_id or "default-user"
        response = self.client.table("user_progress").select("*").eq("user_id", user_id).eq("book_id", book_id).execute()
        return response.data[0] if response.data else None


def get_db() -> DatabaseInterface:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if supabase_url and supabase_key:
        try:
            return SupabaseDatabase(supabase_url, supabase_key)
        except Exception as e:
            print(f"Failed to connect to Supabase: {e}. Falling back to SQLite.")
            
    return SQLiteDatabase()
