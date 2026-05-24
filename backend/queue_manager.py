import os
import asyncio
import traceback
from datetime import datetime
from typing import Set, Dict
from backend.database import get_db
from backend.storage import get_storage
from backend.nlp import segment_chapter_text
from backend.generator import generate_and_stitch_chapter

# Global asyncio queue for book generation tasks
_job_queue = asyncio.Queue()

# Track books currently in queue/processing with their active run ID to handle cancellation/regeneration
_active_jobs: Dict[str, str] = {}

# Configuration
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))
TEMP_DIR = os.getenv("TEMP_DIR", "./tmp")

import uuid

def add_generation_job(book_id: str):
    """
    Adds a book generation task to the queue, canceling/superseding any active runs.
    """
    gen_id = str(uuid.uuid4())
    _active_jobs[book_id] = gen_id
    _job_queue.put_nowait((book_id, gen_id))
    print(f"Enqueued generation job for book {book_id} (run: {gen_id})")
    return True

def cancel_generation_job(book_id: str) -> bool:
    """
    Cancels any active generation job for the book by clearing its active run ID.
    """
    if book_id in _active_jobs:
        _active_jobs.pop(book_id, None)
        print(f"Cancelled generation job for book {book_id}")
        return True
    return False

async def process_book_job(book_id: str, gen_id: str):
    """
    Processes a book chapter by chapter: runs segmenting, TTS, stitching, and uploads.
    """
    db = get_db()
    storage = get_storage()
    
    # Check if this run is still active
    if _active_jobs.get(book_id) != gen_id:
        print(f"Job run {gen_id} for book {book_id} is outdated. Aborting.")
        return
        
    book = db.get_book(book_id)
    if not book:
        print(f"Job failed: Book {book_id} not found in database.")
        return
        
    try:
        db.update_book(book_id, status="processing", current_chapter=0)
        
        # Load character voices mapping
        voices = db.get_character_voices(book_id)
        voice_map = {v["character_name"]: v["edge_tts_voice"] for v in voices}
        
        # Ensure Narrator has a voice assigned
        if "Narrator" not in voice_map:
            # Check if we have gender details or default to Andrew
            voice_map["Narrator"] = "en-US-AndrewNeural"
            db.create_character_voice(book_id, "Narrator", "en-US-AndrewNeural", "male", 0)
            
        chapters = db.get_chapters(book_id)
        total_chapters = len(chapters)
        
        total_words_processed = 0
        total_duration = 0.0
        
        for idx, chapter in enumerate(chapters):
            chapter_id = chapter["id"]
            chapter_num = chapter["chapter_num"]
            title = chapter["title"]
            text_content = chapter.get("raw_text") or ""
            
            # Check if book was stopped by user or superseded by a new run
            if _active_jobs.get(book_id) != gen_id:
                print(f"Job run {gen_id} for book {book_id} was superseded or cancelled. Halting worker.")
                break
                
            book_check = db.get_book(book_id)
            if not book_check or book_check["status"] == "stopped":
                print(f"Job for book {book_id} was stopped by user. Halting.")
                break
                
            # Update status
            status_msg = f"processing_chapter_{chapter_num}_{total_chapters}"
            db.update_book(book_id, status=status_msg, current_chapter=chapter_num)
            db.update_chapter(chapter_id, status="processing")
            
            print(f"Processing book {book_id} - Chapter {chapter_num}/{total_chapters}: {title}")
            
            # 1. Segment chapter text into dialogue and narration blocks
            segments = segment_chapter_text(text_content, voice_map)
            
            # 2. Generate and stitch TTS files
            local_mp3 = os.path.join(TEMP_DIR, f"{book_id}_ch_{chapter_num}.mp3")
            local_json = os.path.join(TEMP_DIR, f"{book_id}_ch_{chapter_num}_timestamps.json")
            
            try:
                duration_seconds, word_count = await generate_and_stitch_chapter(
                    segments=segments,
                    output_mp3_path=local_mp3,
                    output_json_path=local_json,
                    temp_dir=os.path.join(TEMP_DIR, f"temp_{book_id}_ch_{chapter_num}")
                )
                
                # 3. Upload outputs to storage (R2 or Local)
                r2_mp3_key = f"books/{book_id}/chapter_{chapter_num}.mp3"
                r2_json_key = f"books/{book_id}/chapter_{chapter_num}_timestamps.json"
                
                audio_url = storage.upload_file(local_mp3, r2_mp3_key)
                timestamps_url = storage.upload_file(local_json, r2_json_key)
                
                # Update chapter table in db
                db.update_chapter(
                    chapter_id,
                    status="complete",
                    audio_url=audio_url,
                    timestamps_url=timestamps_url,
                    duration_seconds=duration_seconds,
                    word_count=word_count
                )
                
                total_words_processed += word_count
                total_duration += duration_seconds
                
            except Exception as chapter_err:
                print(f"Failed to generate chapter {chapter_num}: {chapter_err}")
                db.update_chapter(chapter_id, status="error")
                # Continue processing other chapters
            finally:
                # Cleanup local generated files
                if os.path.exists(local_mp3):
                    os.remove(local_mp3)
                if os.path.exists(local_json):
                    os.remove(local_json)
                    
        # Update final book state
        est_hours = total_duration / 3600.0
        db.update_book(
            book_id,
            status="complete",
            current_chapter=total_chapters,
            total_words=total_words_processed,
            estimated_audio_hours=est_hours
        )
        print(f"Successfully processed book {book_id}!")
        
    except Exception as e:
        print(f"Fatal error processing book {book_id}: {e}")
        traceback.print_exc()
        db.update_book(book_id, status="error")
    finally:
        # Only discard if this run is still the active one
        if _active_jobs.get(book_id) == gen_id:
            _active_jobs.pop(book_id, None)

async def queue_worker(worker_id: int):
    """
    Worker task pulling jobs from the asyncio queue.
    """
    print(f"Started job queue worker {worker_id}")
    while True:
        item = await _job_queue.get()
        book_id, gen_id = item
        try:
            print(f"Worker {worker_id} picking up book {book_id} (run: {gen_id})")
            await process_book_job(book_id, gen_id)
        except Exception as e:
            print(f"Error in worker {worker_id} processing book {book_id}: {e}")
        finally:
            _job_queue.task_done()

# Global list of worker task objects
_worker_tasks = []

def start_queue_workers():
    """
    Spawns background workers for processing queue.
    """
    global _worker_tasks
    if _worker_tasks:
        return
        
    for i in range(MAX_CONCURRENT_JOBS):
        task = asyncio.create_task(queue_worker(i + 1))
        _worker_tasks.append(task)
    print(f"Spawned {MAX_CONCURRENT_JOBS} background generation workers.")
