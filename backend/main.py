import os
import re
import json
import shutil
import tempfile
import asyncio
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.database import get_db
from backend.storage import get_storage
from backend.nlp import extract_characters, get_deterministic_voice
from backend.queue_manager import add_generation_job, start_queue_workers, cancel_generation_job

app = FastAPI(title="AudioBook Studio API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local development and testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create folders
TEMP_DIR = os.getenv("TEMP_DIR", "./tmp")
STORAGE_DIR = "./tmp/storage"
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)

# Mount local storage folder to serve MP3s and JSONs in local fallback mode
app.mount("/static", StaticFiles(directory=STORAGE_DIR), name="static")

@app.on_event("startup")
async def startup_event():
    # Start background job queue workers
    start_queue_workers()
    
    # Auto-resume any interrupted book generations
    try:
        db = get_db()
        books = db.get_books()
        for book in books:
            status = book.get("status", "")
            if status == "queued" or status.startswith("processing"):
                print(f"Resuming interrupted generation for book {book['id']} ('{book['title']}')")
                # Reset processing chapters of this book back to queued
                chapters = db.get_chapters(book["id"])
                for ch in chapters:
                    if ch["status"] in ["queued", "processing"]:
                        db.update_chapter(ch["id"], status="queued")
                # Reset book status to queued
                db.update_book(book["id"], status="queued")
                # Add to queue
                add_generation_job(book["id"])
    except Exception as e:
        print(f"Error resuming interrupted jobs on startup: {e}")

# Pydantic schemas for request bodies
class CharacterVoiceUpdate(BaseModel):
    character_name: str
    edge_tts_voice: str

class ProgressSave(BaseModel):
    user_id: Optional[str] = "default-user"
    book_id: str
    chapter_id: str
    position_ms: float
    word_index: int

# Helper functions
def parse_epub_clean_with_metadata(epub_path: str) -> tuple[str, str, List[tuple[str, str]]]:
    import zipfile
    import xml.etree.ElementTree as ET
    from bs4 import BeautifulSoup
    import re
    
    raw_sections = []
    title = "Unknown Title"
    author = "Unknown Author"
    
    def partition_html(element, state=None):
        if state is None:
            state = {
                'current_heading': None,
                'current_text': [],
                'sections': []
            }
        for child in element.children:
            if child.name in ['h1', 'h2', 'h3', 'h4']:
                text = '\n\n'.join(state['current_text']).strip()
                if text or state['current_heading'] is not None:
                    state['sections'].append((state['current_heading'], text))
                state['current_heading'] = child.get_text().strip()
                state['current_text'] = []
            elif child.name in ['script', 'style']:
                continue
            elif isinstance(child, str):
                stripped = child.strip()
                if stripped:
                    state['current_text'].append(stripped)
            else:
                partition_html(child, state)
        return state

    try:
        with zipfile.ZipFile(epub_path, 'r') as z:
            # 1. Read container.xml to locate the OPF file
            container_xml = z.read("META-INF/container.xml")
            root = ET.fromstring(container_xml)
            ns = {"ns": "urn:oasis:names:tc:opendocument:xmlns:container"}
            rootfile = root.find(".//ns:rootfile", namespaces=ns)
            if rootfile is None:
                raise ValueError("No rootfile found in container.xml")
            
            opf_path = rootfile.attrib["full-path"]
            opf_dir = os.path.dirname(opf_path)
            
            # 2. Read OPF file
            opf_xml = z.read(opf_path)
            opf_root = ET.fromstring(opf_xml)
            
            # Define namespaces for OPF
            opf_ns = {
                "opf": "http://www.idpf.org/2007/opf",
                "dc": "http://purl.org/dc/elements/1.1/"
            }
            
            # Find title and author
            title_el = opf_root.find(".//dc:title", namespaces=opf_ns)
            author_el = opf_root.find(".//dc:creator", namespaces=opf_ns)
            if title_el is not None and title_el.text:
                title = title_el.text.strip()
            if author_el is not None and author_el.text:
                author = author_el.text.strip()
            
            # Build manifest dictionary: item_id -> href
            manifest_items = {}
            manifest = opf_root.find(".//opf:manifest", namespaces=opf_ns)
            if manifest is not None:
                for item in manifest.findall("opf:item", namespaces=opf_ns):
                    manifest_items[item.attrib["id"]] = item.attrib["href"]
                    
            # Parse spine to get reading order
            spine = opf_root.find(".//opf:spine", namespaces=opf_ns)
            if spine is None:
                raise ValueError("No spine found in OPF file")
                
            spine_items = []
            for itemref in spine.findall("opf:itemref", namespaces=opf_ns):
                idref = itemref.attrib["idref"]
                if idref in manifest_items:
                    href = manifest_items[idref]
                    full_href = os.path.join(opf_dir, href) if opf_dir else href
                    full_href = full_href.replace("\\", "/")
                    spine_items.append((idref, full_href))
                    
            # 3. Read and extract text from each spine item
            for idref, path in spine_items:
                try:
                    zip_path = path
                    if zip_path not in z.namelist():
                        base_name = os.path.basename(path)
                        found = False
                        for name in z.namelist():
                            if name.endswith("/" + base_name) or name == base_name:
                                zip_path = name
                                found = True
                                break
                        if not found:
                            continue
                            
                    html_content = z.read(zip_path)
                    soup = BeautifulSoup(html_content, "html.parser")
                    
                    # Partition document contents by headings
                    state = partition_html(soup.body if soup.body else soup)
                    text = '\n\n'.join(state['current_text']).strip()
                    if text or state['current_heading'] is not None:
                        state['sections'].append((state['current_heading'], text))
                        
                    for title_raw, txt in state['sections']:
                        title_clean = " ".join(title_raw.split()) if title_raw else None
                        
                        if title_clean is None:
                            if raw_sections:
                                prev_title, prev_txt = raw_sections[-1]
                                raw_sections[-1] = (prev_title, prev_txt + "\n\n" + txt)
                            else:
                                raw_sections.append(("Introduction", txt))
                        else:
                            raw_sections.append((title_clean, txt))
                except Exception as item_err:
                    print(f"Error parsing spine item {path}: {item_err}")
    except Exception as e:
        print(f"Error reading EPUB zip: {e}")
        
    # Clean up sections and apply filters
    chapters = []
    for ch_title, ch_text in raw_sections:
        # Truncate Gutenberg start boilerplate
        start_match = re.search(r'\*\*\*\s*START OF THIS PROJECT GUTENBERG EBOOK.*?\*\*\*', ch_text, re.IGNORECASE)
        if start_match:
            ch_text = ch_text[start_match.end():]
            
        # Truncate Gutenberg end boilerplate
        end_match = re.search(r'(?:End of the Project Gutenberg EBook|\*\*\*\s*END OF THIS PROJECT GUTENBERG EBOOK)', ch_text, re.IGNORECASE)
        if end_match:
            ch_text = ch_text[:end_match.start()]
            
        ch_text = ch_text.strip()
        ch_title = ch_title.strip()
        
        # Word count check
        word_count = len(ch_text.split())
        if word_count < 10:
            continue
            
        # Skip table of contents
        if ch_title.lower() in ["contents", "table of contents", "index"]:
            continue
            
        chapters.append((ch_title, ch_text))
        
    if not chapters:
        chapters = [("Introduction", "No readable chapters found inside EPUB.")]
        
    return title, author, chapters

def split_into_chapters(text: str) -> List[tuple[str, str]]:
    """
    Split the full text into chapters based on headings and patterns.
    Returns list of (chapter_title, chapter_text).
    """
    lines = text.split("\n")
    chapters = []
    current_title = "Introduction"
    current_lines = []
    
    # Matching headings like: H1/H2 markdown, Chapter 1, CHAPTER II, Chapter One, etc.
    md_pattern = re.compile(r'^(?:#|##|###)\s+(.*)$')
    plain_pattern = re.compile(r'^\s*(?:chapter|c-h-a-p-t-e-r|book|section|part)\s+([0-9a-zA-Z\-_ivxldcm\.\s]+)', re.IGNORECASE)
    
    for line in lines:
        stripped = line.strip()
        is_heading = False
        heading_title = ""
        
        md_match = md_pattern.match(stripped)
        if md_match:
            is_heading = True
            heading_title = md_match.group(1).strip()
        else:
            plain_match = plain_pattern.match(stripped)
            if plain_match and len(stripped) < 100:
                is_heading = True
                heading_title = stripped
                
        if is_heading:
            ch_text = "\n".join(current_lines).strip()
            if ch_text or len(chapters) > 0:
                chapters.append((current_title, ch_text or "..."))
            current_title = heading_title
            current_lines = []
        else:
            current_lines.append(line)
            
    # Add final chapter
    ch_text = "\n".join(current_lines).strip()
    chapters.append((current_title, ch_text or "..."))
    
    if len(chapters) == 1 and not chapters[0][1].strip():
        chapters = [("Chapter 1", text)]
        
    return chapters

@app.post("/api/books/upload")
async def upload_book(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None)
):
    # Determine extension
    filename = file.filename or "book.pdf"
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in [".pdf", ".epub"]:
        raise HTTPException(status_code=400, detail="Only PDF and EPUB files are supported.")
        
    db = get_db()
    
    # Save uploaded file to a temporary location
    suffix = file_ext
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name
        
    try:
        chapters_data = []
        if file_ext == ".epub":
            print(f"Parsing EPUB {filename} using clean custom parser...")
            title_meta, author_meta, chapters_data = parse_epub_clean_with_metadata(temp_path)
            if not title:
                title = title_meta
            if not author:
                author = author_meta
            text_content = "\n\n".join(ch_text for ch_title, ch_text in chapters_data)
        else:
            # Convert book to clean Markdown text using MarkItDown
            from markitdown import MarkItDown
            md = MarkItDown()
            print(f"Converting {filename} using MarkItDown...")
            result = md.convert(temp_path)
            text_content = result.text_content
            
            if not text_content or not text_content.strip():
                raise HTTPException(status_code=400, detail="Failed to extract text from file.")
                
            # Parse title and author if not provided
            if not title:
                # strip extension and clean up filename
                title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()
            if not author:
                author = "Unknown Author"
                
            # Split text into chapters
            chapters_data = split_into_chapters(text_content)
            
        total_chapters = len(chapters_data)
        
        # Calculate total word estimate
        total_words = sum(len(ch_text.split()) for ch_title, ch_text in chapters_data)
        # Estimate: average speaking rate is 150 words per minute
        est_hours = (total_words / 150.0) / 60.0
        
        # Create book record
        book = db.create_book(
            title=title,
            author=author,
            file_type=file_ext.strip("."),
            total_chapters=total_chapters,
            status="queued",
            total_words=total_words,
            estimated_audio_hours=est_hours
        )
        book_id = book["id"]
        
        # Save chapters
        for i, (ch_title, ch_text) in enumerate(chapters_data):
            ch_num = i + 1
            word_count = len(ch_text.split())
            
            # Save raw text along with the chapter metadata
            db.create_chapter(
                book_id=book_id,
                chapter_num=ch_num,
                title=ch_title,
                status="queued",
                word_count=word_count
            )
            # SQLite / Supabase support raw_text field in chapters table. Let's make sure it's updated.
            # (In SQLite database schema, we can store raw_text. In Supabase table, let's make sure we insert it).
            # We'll update the chapter raw_text:
            # Get the newly created chapter and update it
            chapters = db.get_chapters(book_id)
            new_chapter = [c for c in chapters if c["chapter_num"] == ch_num][0]
            db.update_chapter(new_chapter["id"], raw_text=ch_text)
            
        # Analyze characters and generate voice map
        print("Extracting characters...")
        characters = extract_characters(text_content)
        
        # Save character voice assignments
        # Add Narrator first
        db.create_character_voice(book_id, "Narrator", "en-US-AndrewNeural", "male", 0)
        
        for char in characters:
            name = char["character_name"]
            gender = char["gender"]
            lines = char["line_count"]
            
            voice = get_deterministic_voice(name, gender)
            db.create_character_voice(book_id, name, voice, gender, lines)
            
        # Queue the job for background generation
        add_generation_job(book_id)
        
        return {"book_id": book_id, "status": "queued"}
        
    except Exception as e:
        print(f"Error during ingestion: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Book ingestion failed: {str(e)}")
    finally:
        # Cleanup ingested temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/books/{book_id}/cancel")
async def cancel_book_generation(book_id: str):
    db = get_db()
    book = db.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
        
    db.update_book(book_id, status="stopped")
    
    # Cancel in queue manager
    cancel_generation_job(book_id)
    
    # Update status of chapters
    chapters = db.get_chapters(book_id)
    for ch in chapters:
        if ch["status"] in ["queued", "processing"]:
            db.update_chapter(ch["id"], status="stopped")
            
    return {"status": "stopped", "message": "Book generation stopped."}

@app.delete("/api/books/{book_id}")
async def delete_book(book_id: str):
    db = get_db()
    book = db.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    # Stop any active generation
    cancel_generation_job(book_id)

    # Delete audio + timestamp files from disk
    try:
        chapters = db.get_chapters(book_id)
        for ch in chapters:
            for url_key in ("audio_url", "timestamps_url"):
                url = ch.get(url_key)
                if url and url.startswith("/static/"):
                    local_path = os.path.join(STORAGE_DIR, url[len("/static/"):])
                    if os.path.exists(local_path):
                        os.remove(local_path)
        # Remove any per-book storage folder if it exists
        book_folder = os.path.join(STORAGE_DIR, book_id)
        if os.path.isdir(book_folder):
            shutil.rmtree(book_folder, ignore_errors=True)
    except Exception as e:
        print(f"[delete_book] Error cleaning files for {book_id}: {e}")

    # Remove all DB records
    db.delete_book(book_id)

    return {"status": "deleted", "book_id": book_id}

@app.post("/api/books/{book_id}/resume")
async def resume_book_generation(book_id: str):
    db = get_db()
    book = db.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
        
    db.update_book(book_id, status="queued")
    
    # Reset stopped chapters to queued
    chapters = db.get_chapters(book_id)
    for ch in chapters:
        if ch["status"] == "stopped":
            db.update_chapter(ch["id"], status="queued")
            
    add_generation_job(book_id)
    return {"status": "queued", "message": "Book generation resumed."}

@app.get("/api/books/{book_id}/status")
async def get_book_status(book_id: str):
    db = get_db()
    book = db.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
        
    status = book["status"]
    current_chapter = book.get("current_chapter", 0) or 0
    total_chapters = book["total_chapters"]
    
    percent_complete = 0
    eta_minutes = -1
    
    if status == "complete":
        percent_complete = 100
        eta_minutes = 0
    elif status.startswith("processing"):
        # Match 'processing_chapter_N_M'
        match = re.match(r'processing_chapter_(\d+)_(\d+)', status)
        if match:
            current_chapter = int(match.group(1))
            total_chapters = int(match.group(2))
            
        # Calculate percentage complete: N-1 completed chapters out of total M
        percent_complete = int(((current_chapter - 0.5) / total_chapters) * 100)
        percent_complete = max(1, min(99, percent_complete))
        
        # Calculate ETA based on words in remaining chapters
        try:
            chapters = db.get_chapters(book_id)
            remaining_words = sum(c.get("word_count", 0) or 0 for c in chapters if c["chapter_num"] >= current_chapter)
            
            # edge-tts processes at roughly 5000 words per minute of processing time
            eta_minutes = max(1, int(remaining_words / 5000))
        except Exception:
            # Fallback estimation
            remaining_chapters = total_chapters - current_chapter + 1
            eta_minutes = max(1, int(remaining_chapters * 1.5))
            
    return {
        "status": status,
        "current_chapter": current_chapter,
        "total_chapters": total_chapters,
        "percent_complete": percent_complete,
        "eta_minutes": eta_minutes
    }

@app.get("/api/books/{book_id}")
async def get_book_details(book_id: str):
    db = get_db()
    book = db.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
        
    chapters = db.get_chapters(book_id)
    # Remove raw_text from response to keep payload size small
    cleaned_chapters = []
    for ch in chapters:
        ch_dict = dict(ch)
        if "raw_text" in ch_dict:
            del ch_dict["raw_text"]
        cleaned_chapters.append(ch_dict)
        
    return {
        "book": book,
        "chapters": cleaned_chapters
    }

@app.get("/api/books/{book_id}/characters")
async def get_book_characters(book_id: str):
    db = get_db()
    characters = db.get_character_voices(book_id)
    return characters

@app.patch("/api/books/{book_id}/characters")
async def update_character_voices(book_id: str, updates: List[CharacterVoiceUpdate]):
    db = get_db()
    book = db.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
        
    # Cancel any active generation task
    cancel_generation_job(book_id)
    
    # Apply voice changes
    for update in updates:
        db.update_character_voice(book_id, update.character_name, update.edge_tts_voice)
        
    # Reset status of chapters that contain the dialogue of modified characters
    chapters = db.get_chapters(book_id)
    
    # For phase 1, we reset all chapters and trigger regeneration to ensure
    # exact millisecond stitching transitions.
    for ch in chapters:
        db.update_chapter(ch["id"], status="queued", audio_url=None, timestamps_url=None)
        
    db.update_book(book_id, status="queued", current_chapter=0)
    
    # Re-queue the book for regeneration
    add_generation_job(book_id)
    
    return {"status": "queued", "message": "Voice mappings updated. Book queued for regeneration."}

@app.get("/api/chapters/{chapter_id}/audio")
async def get_chapter_audio(chapter_id: str):
    db = get_db()
    storage = get_storage()
    
    chapter = db.get_chapter(chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")
        
    # Get signed url from storage
    if not chapter["audio_url"]:
        raise HTTPException(status_code=400, detail="Chapter audio is not generated yet.")
        
    # Extract original key to get signed URL
    # Keys are like: books/{book_id}/chapter_{num}.mp3
    # Our relative path is /static/books/{book_id}/chapter_{num}.mp3
    url = chapter["audio_url"]
    
    if url.startswith("/static/"):
        # LocalStorage - prepend server prefix if required or return relative url
        # To support CORS and cross-device testing, we can return the path directly
        return {"audio_url": url}
        
    # R2 storage - we generate a fresh presigned URL
    book_id = chapter["book_id"]
    ch_num = chapter["chapter_num"]
    r2_key = f"books/{book_id}/chapter_{ch_num}.mp3"
    
    try:
        presigned_url = storage.get_signed_url(r2_key)
        return {"audio_url": presigned_url}
    except Exception as e:
        print(f"Failed to generate presigned URL: {e}")
        # Return fallback URL stored in database
        return {"audio_url": url}

@app.get("/api/chapters/{chapter_id}/timestamps")
async def get_chapter_timestamps(chapter_id: str):
    db = get_db()
    chapter = db.get_chapter(chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")
        
    if not chapter["timestamps_url"]:
        raise HTTPException(status_code=400, detail="Chapter timestamps are not generated yet.")
        
    storage = get_storage()
    book_id = chapter["book_id"]
    ch_num = chapter["chapter_num"]
    r2_key = f"books/{book_id}/chapter_{ch_num}_timestamps.json"
    
    # Optimization: Read and return JSON directly to avoid client-side fetches
    # LocalStorage check
    if chapter["timestamps_url"].startswith("/static/"):
        local_path = os.path.join(STORAGE_DIR, r2_key)
        if os.path.exists(local_path):
            with open(local_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise HTTPException(status_code=404, detail="Local timestamps file not found.")
        
    # R2 storage check
    try:
        import boto3
        account_id = os.getenv("R2_ACCOUNT_ID")
        access_key = os.getenv("R2_ACCESS_KEY")
        secret_key = os.getenv("R2_SECRET_KEY")
        bucket_name = os.getenv("R2_BUCKET_NAME", "audiobooks")
        
        r2_client = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto"
        )
        response = r2_client.get_object(Bucket=bucket_name, Key=r2_key)
        content = response["Body"].read().decode("utf-8")
        return json.loads(content)
    except Exception as e:
        print(f"Failed to fetch timestamps from R2: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load timestamps from storage: {e}")

@app.post("/api/progress")
async def save_progress(progress: ProgressSave):
    db = get_db()
    res = db.save_progress(
        user_id=progress.user_id,
        book_id=progress.book_id,
        chapter_id=progress.chapter_id,
        position_ms=progress.position_ms,
        word_index=progress.word_index
    )
    return res

@app.get("/api/progress/{book_id}")
async def get_progress(book_id: str, user_id: str = "default-user"):
    db = get_db()
    progress = db.get_progress(user_id, book_id)
    if not progress:
        return {"message": "No progress found for this book."}
    return progress

@app.get("/api/voices")
async def list_available_voices():
    # Return high-quality voices list matching the rules
    voices = [
        {"id": "en-US-AndrewNeural", "name": "Andrew", "gender": "male", "locale": "en-US", "description": "Warm narration (default)"},
        {"id": "en-US-JennyNeural", "name": "Jenny", "gender": "female", "locale": "en-US", "description": "Warm narration (default)"},
        {"id": "en-US-GuyNeural", "name": "Guy", "gender": "male", "locale": "en-US", "description": "Confident, mid-age"},
        {"id": "en-US-EricNeural", "name": "Eric", "gender": "male", "locale": "en-US", "description": "Calm, deep"},
        {"id": "en-US-BrianNeural", "name": "Brian", "gender": "male", "locale": "en-US", "description": "Young, energetic"},
        {"id": "en-GB-RyanNeural", "name": "Ryan", "gender": "male", "locale": "en-GB", "description": "British male"},
        {"id": "en-AU-WilliamNeural", "name": "William", "gender": "male", "locale": "en-AU", "description": "Australian male"},
        {"id": "en-US-AriaNeural", "name": "Aria", "gender": "female", "locale": "en-US", "description": "Expressive, young"},
        {"id": "en-US-SaraNeural", "name": "Sara", "gender": "female", "locale": "en-US", "description": "Warm, friendly"},
        {"id": "en-GB-SoniaNeural", "name": "Sonia", "gender": "female", "locale": "en-GB", "description": "British female"},
        {"id": "en-AU-NatashaNeural", "name": "Natasha", "gender": "female", "locale": "en-AU", "description": "Australian female"},
        {"id": "en-US-NancyNeural", "name": "Nancy", "gender": "female", "locale": "en-US", "description": "Mature, authoritative"},
    ]
    return voices

@app.get("/api/voices/{voice_id}/preview")
async def get_voice_preview(voice_id: str):
    """
    Generates and returns a short speech preview of the selected voice.
    """
    import edge_tts
    # Clean up name for preview
    name_clean = voice_id.split("-")[-1].replace("Neural", "")
    text = f"Hello, I am the {name_clean} voice. I hope you enjoy listening to this audiobook."
    
    try:
        communicate = edge_tts.Communicate(text, voice_id)
        audio_data = b""
        async for event in communicate.stream():
            if event["type"] == "audio":
                audio_data += event["data"]
                
        from fastapi.responses import Response
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate voice preview: {e}")

@app.get("/api/books")
async def list_books():
    db = get_db()
    books = db.get_books()
    return books

@app.get("/api/chapters/{chapter_id}/text")
async def get_chapter_text(chapter_id: str):
    """
    Returns the raw text of a specific chapter.
    Useful for displaying the text in the player window.
    """
    db = get_db()
    chapter = db.get_chapter(chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")
    
    # Read the full raw text from chapter record
    # SQLite/Supabase returns dict-like Row with 'raw_text'
    return {"text": chapter.get("raw_text") or ""}

