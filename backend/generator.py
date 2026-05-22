import os
import json
import asyncio
import edge_tts
from typing import List, Dict, Any, Tuple
from pydub import AudioSegment

# Configure ffmpeg path if provided in environment
ffmpeg_path = os.getenv("FFMPEG_PATH")
if ffmpeg_path:
    AudioSegment.converter = ffmpeg_path

async def _generate_single_attempt(communicate: edge_tts.Communicate, temp_mp3_path: str) -> List[Dict[str, Any]]:
    word_boundaries = []
    audio_data = b""
    async for event in communicate.stream():
        if event["type"] == "audio":
            audio_data += event["data"]
        elif event["type"] == "WordBoundary":
            # Convert ticks (100ns units) to milliseconds
            start_ms = event["offset"] / 10000.0
            duration_ms = event["duration"] / 10000.0
            word_boundaries.append({
                "word": event["text"],
                "start_ms": start_ms,
                "duration_ms": duration_ms
            })
    if not audio_data:
        raise ValueError("Received empty audio data from edge-tts")
        
    # Save segment audio
    os.makedirs(os.path.dirname(temp_mp3_path), exist_ok=True)
    with open(temp_mp3_path, "wb") as f:
        f.write(audio_data)
        
    return word_boundaries

async def generate_segment_audio(segment: Dict[str, Any], temp_mp3_path: str) -> List[Dict[str, Any]]:
    """
    Calls edge-tts to generate audio and collect word boundaries for a single segment.
    Saves audio to temp_mp3_path and returns list of word boundaries.
    Includes timeouts and retry mechanism with exponential backoff.
    """
    text = segment["text"]
    voice = segment["voice"]
    rate = segment["rate"]
    volume = segment["volume"]
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate,
                volume=volume,
                boundary="WordBoundary"
            )
            return await asyncio.wait_for(
                _generate_single_attempt(communicate, temp_mp3_path),
                timeout=15.0  # 15 seconds timeout
            )
        except (asyncio.TimeoutError, Exception) as e:
            print(f"Error generating segment (attempt {attempt+1}/{max_retries}) for text '{text[:30]}...': {e}")
            if attempt < max_retries - 1:
                # Exponential backoff
                await asyncio.sleep(2.0 ** attempt)
            else:
                print(f"Failed to generate segment after {max_retries} attempts. Skipping segment.")
                # Return empty to allow the rest of the generation to succeed resiliently
                return []

async def generate_segment_audio_sem(sem, segment: Dict[str, Any], temp_mp3_path: str) -> List[Dict[str, Any]]:
    async with sem:
        return await generate_segment_audio(segment, temp_mp3_path)

async def generate_and_stitch_chapter(
    segments: List[Dict[str, Any]],
    output_mp3_path: str,
    output_json_path: str,
    temp_dir: str = "./tmp/temp_segments"
) -> Tuple[float, int]:
    """
    Generates TTS for all segments in parallel, stitches them together using pydub,
    adds speaker-dependent silence, maps word boundaries with cumulative offsets,
    and writes the final MP3 and word-timestamp JSON files.
    
    Returns a tuple of (duration_seconds, total_words).
    """
    os.makedirs(temp_dir, exist_ok=True)
    
    chapter_audio = AudioSegment.empty()
    global_word_boundaries = []
    
    current_offset_ms = 0.0
    previous_speaker = None
    previous_type = None
    
    # 1. Prepare and launch all TTS generation tasks in parallel
    sem = asyncio.Semaphore(3) # limit to 3 concurrent requests to prevent rate limiting
    tasks = []
    
    for i, segment in enumerate(segments):
        if not segment["text"].strip():
            tasks.append(None)
            continue
            
        temp_file = os.path.join(temp_dir, f"seg_{i}.mp3")
        tasks.append(generate_segment_audio_sem(sem, segment, temp_file))
        
    # Run all tasks concurrently
    valid_tasks = [t for t in tasks if t is not None]
    if valid_tasks:
        results = await asyncio.gather(*valid_tasks, return_exceptions=True)
    else:
        results = []
        
    # Map results back to segments
    result_iter = iter(results)
    seg_boundaries_list = []
    for task in tasks:
        if task is None:
            seg_boundaries_list.append(None)
        else:
            res = next(result_iter)
            if isinstance(res, Exception):
                print(f"Error generating segment: {res}")
                seg_boundaries_list.append(None)
            else:
                seg_boundaries_list.append(res)
                
    # 2. Stitch the generated audios in order
    for i, segment in enumerate(segments):
        seg_boundaries = seg_boundaries_list[i]
        if seg_boundaries is None:
            continue
            
        temp_file = os.path.join(temp_dir, f"seg_{i}.mp3")
        if not os.path.exists(temp_file) or os.path.getsize(temp_file) == 0:
            continue
            
        try:
            # Load segment audio using pydub
            segment_audio = AudioSegment.from_mp3(temp_file)
            
            # Apply silence gaps between segments
            silence_ms = 0
            if i > 0:
                current_speaker = segment["speaker"]
                current_type = segment["type"]
                
                if current_speaker != previous_speaker:
                    # 200ms silence gap between different speakers
                    silence_ms = 200
                elif current_type == "narration" and previous_type == "narration":
                    # 500ms silence gap between narration paragraphs
                    silence_ms = 500
                    
                if silence_ms > 0:
                    silence_segment = AudioSegment.silent(duration=silence_ms)
                    chapter_audio += silence_segment
                    current_offset_ms += silence_ms
            
            # Record global word boundaries with cumulative offset
            for wb in seg_boundaries:
                global_word_boundaries.append({
                    "word": wb["word"],
                    "start_ms": current_offset_ms + wb["start_ms"],
                    "duration_ms": wb["duration_ms"],
                    "speaker": segment["speaker"]
                })
                
            # Stitch segment audio
            chapter_audio += segment_audio
            
            # Update running offset by the actual duration of segment audio
            current_offset_ms += len(segment_audio)
            
            # Track states
            previous_speaker = segment["speaker"]
            previous_type = segment["type"]
            
        except Exception as e:
            print(f"Error stitching segment {i}: {e}")
            continue
        finally:
            # Clean up temp file to conserve disk space
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass
                    
    # Export full chapter audio
    if len(chapter_audio) == 0:
        chapter_audio = AudioSegment.silent(duration=1000) # 1 second silence
        
    os.makedirs(os.path.dirname(output_mp3_path), exist_ok=True)
    chapter_audio.export(output_mp3_path, format="mp3", bitrate="128k")
    
    # Save global word-timestamp mapping
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(global_word_boundaries, f, ensure_ascii=False, indent=2)
        
    duration_seconds = len(chapter_audio) / 1000.0
    total_words = len(global_word_boundaries)
    
    return duration_seconds, total_words
