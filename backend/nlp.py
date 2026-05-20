import os
import re
import hashlib
from typing import List, Dict, Any, Tuple, Set

# Global spaCy model instance
_nlp = None

def get_spacy_nlp():
    global _nlp
    if _nlp is not None:
        return _nlp
        
    import spacy
    try:
        # Try loading large model first
        _nlp = spacy.load("en_core_web_lg")
    except OSError:
        try:
            print("en_core_web_lg not found. Trying en_core_web_sm...")
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("Downloading en_core_web_sm...")
            spacy.cli.download("en_core_web_sm")
            _nlp = spacy.load("en_core_web_sm")
            
    return _nlp

# Speech verbs for dialogue speaker attribution
SPEECH_VERBS = (
    "said|asked|replied|whispered|shouted|murmured|called|cried|"
    "answered|muttered|exclaimed|screamed|yelled|whispered|breathed|"
    "replied|responded|demanded|asked|objected|agreed|continued|added|mumbled"
)

# Lists of common names for fallback gender detection
COMMON_FEMALE = {
    "mary", "maria", "elizabeth", "jane", "alice", "catherine", "helen", "sarah",
    "emily", "jessica", "charlotte", "lucy", "sophie", "emma", "olivia", "grace",
    "rose", "clara", "margaret", "lilly", "jenny", "aria", "sara", "sonia",
    "natasha", "nancy", "irene", "violet", "edith", "agatha", "harriet", "dorothy",
    "eleanor", "anne", "hannah", "beatrice", "diana", "laura", "rachel", "rebecca",
    "ruth", "susan", "barbara", "patricia", "linda", "lisa", "karen", "donna",
    "carol", "michelle", "sandra", "betty", "deborah", "anna", "kate", "claire",
    "amy", "victoria", "audrey", "mrs", "lady", "queen", "princess", "duchess",
    "adler", "hunter", "effie", "cecily", "beryl", "violet", "maud", "nora",
    "hattie", "flora", "ada", "bea", "vera", "winifred", "constance", "millicent",
}
COMMON_MALE = {
    "john", "peter", "andrew", "william", "robert", "james", "charles", "guy",
    "brian", "eric", "ryan", "michael", "david", "george", "arthur", "thomas",
    "edward", "henry", "harry", "jack", "sam", "paul", "richard", "mark",
    "steven", "stephen", "philip", "simon", "ian", "alan", "kevin", "graham",
    "daniel", "joseph", "benjamin", "nicholas", "leonard", "sherlock", "watson",
    "lestrade", "holmes", "mycroft", "hudson", "pinner", "neill", "musgrave",
    "phelps", "inspector", "mr", "sir", "lord", "colonel", "captain", "major",
    "sergeant", "dr", "professor",
}

def detect_gender(name: str, text_context: str) -> str:
    """
    Detects gender using pronoun context window around name occurrences.
    If context is inconclusive, falls back to name heuristics.
    """
    name_lower = name.lower()
    first_name = name_lower.split()[0]  # Use first token for name lookups

    # 1. Pronoun analysis in text context
    matches = list(re.finditer(re.escape(name_lower), text_context.lower()))
    he_count = 0
    she_count = 0

    for match in matches:
        start = max(0, match.start() - 120)
        end = min(len(text_context), match.end() + 120)
        window = text_context[start:end].lower()

        # Count male pronouns
        he_count += len(re.findall(r'\b(he|him|his|himself)\b', window))
        # Count female pronouns
        she_count += len(re.findall(r'\b(she|her|hers|herself)\b', window))

    if she_count > he_count:
        return "female"
    elif he_count > she_count:
        return "male"

    # 2. Exact name match in common sets (first name)
    if first_name in COMMON_FEMALE or name_lower in COMMON_FEMALE:
        return "female"
    if first_name in COMMON_MALE or name_lower in COMMON_MALE:
        return "male"

    # 3. Title-based detection (Mrs., Ms., Lady → female; Mr., Sir, Lord → male)
    if re.match(r'^(mrs|ms|miss|lady|dame)[\.\s]', name_lower):
        return "female"
    if re.match(r'^(mr|sir|lord|colonel|captain|major|sergeant|dr|prof)[\.\s]', name_lower):
        return "male"

    # 4. Common female name endings
    if re.search(r'(a|ia|ie|elle|ette|ine|ey|lyn|lynn|een|ene)$', first_name):
        return "female"

    # Default to male
    return "male"

def get_deterministic_voice(name: str, gender: str) -> str:
    """
    Deterministically hash character name to assign a voice from the gendered pool.
    """
    if name.lower() == "narrator":
        return "en-US-AndrewNeural" # Male warm (default)
        
    male_voices = [
        "en-US-GuyNeural",        # confident, mid-age
        "en-US-EricNeural",       # calm, deep
        "en-US-BrianNeural",      # young, energetic
        "en-GB-RyanNeural",       # British accent
        "en-AU-WilliamNeural"     # Australian male
    ]
    female_voices = [
        "en-US-AriaNeural",       # expressive, young
        "en-US-SaraNeural",       # warm, friendly
        "en-GB-SoniaNeural",      # British female
        "en-AU-NatashaNeural",    # Australian female
        "en-US-NancyNeural"       # mature, authoritative
    ]
    
    pool = female_voices if gender == "female" else male_voices
    h = int(hashlib.md5(name.encode("utf-8")).hexdigest(), 16)
    idx = h % len(pool)
    return pool[idx]

def extract_characters(text: str) -> List[Dict[str, Any]]:
    """
    Processes the entire text to extract potential characters using spaCy NER and dialogue attributions.
    Returns list of character dicts: {name, gender, line_count}
    """
    nlp = get_spacy_nlp()
    doc = nlp(text[:1000000]) # Cap spaCy processing to 1M chars to avoid memory issues
    
    # 1. Gather all PERSON entities
    person_counts = {}
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            # Clean up name (remove titles, possessives, and trailing punctuations)
            name = ent.text.strip().strip("'s").strip("’s")
            # Only count capitalized multi-letter names that look like clean names
            if re.match(r'^[A-Z][a-zA-Z\-]+$', name) and len(name) > 1:
                person_counts[name] = person_counts.get(name, 0) + 1
                
    # 2. Parse dialogues to attribute spoke lines
    normalized_text = text.replace("“", '"').replace("”", '"')
    parts = normalized_text.split('"')
    
    dialogue_speakers = {}
    for i in range(1, len(parts), 2):
        preceding = parts[i-1] if i > 0 else ""
        succeeding = parts[i+1] if i < len(parts) - 1 else ""
        
        speaker = find_attributed_speaker_in_context(preceding, succeeding)
        if speaker:
            dialogue_speakers[speaker] = dialogue_speakers.get(speaker, 0) + 1
            
    # Combine NER and dialogue counts
    # If a name has dialogue lines, it's definitely a character.
    # Otherwise, if it has high NER counts (e.g. >= 3), we consider it a character.
    all_names = set(person_counts.keys()).union(dialogue_speakers.keys())
    characters = []
    
    for name in all_names:
        line_count = dialogue_speakers.get(name, 0)
        ner_count = person_counts.get(name, 0)
        
        # Minimum threshold to avoid noise
        if line_count > 0 or ner_count >= 3:
            gender = detect_gender(name, text)
            characters.append({
                "character_name": name,
                "gender": gender,
                "line_count": line_count or 1 # at least 1 line
            })
            
    # Sort characters by line count (descending)
    characters.sort(key=lambda c: c["line_count"], reverse=True)
    return characters

def find_attributed_speaker_in_context(preceding: str, succeeding: str) -> Optional[str]:
    """
    Search preceding or succeeding text close to the quote for a speaker attribution.
    """
    # Look at the first 80 characters of the succeeding text (or up to the end of sentence)
    succ_window = succeeding[:80].strip()
    # Look at the last 80 characters of the preceding text
    prec_window = preceding[-80:].strip()
    
    # Succeeding matches
    # 1. said CharacterName (e.g. 'said John', 'whispered Mary')
    match_succ1 = re.search(rf'^\s*[,.]?\s*(?:{SPEECH_VERBS})\s+([A-Z][a-zA-Z\-]+)', succ_window)
    if match_succ1:
        return match_succ1.group(1)
        
    # 2. CharacterName said (e.g. 'John replied', 'Mary asked.')
    match_succ2 = re.search(rf'^\s*[,.]?\s*([A-Z][a-zA-Z\-]+)\s+(?:{SPEECH_VERBS})', succ_window)
    if match_succ2:
        return match_succ2.group(1)
        
    # Preceding matches
    # 3. CharacterName said (e.g. 'John said,')
    match_prec1 = re.search(rf'([A-Z][a-zA-Z\-]+)\s+(?:{SPEECH_VERBS})\s*[,.]?\s*$', prec_window)
    if match_prec1:
        return match_prec1.group(1)
        
    # 4. said CharacterName (e.g. 'said John:')
    match_prec2 = re.search(rf'(?:{SPEECH_VERBS})\s+([A-Z][a-zA-Z\-]+)\s*[,.]?\s*$', prec_window)
    if match_prec2:
        return match_prec2.group(1)
        
    return None

def segment_chapter_text(text: str, character_voices: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Splits the raw text of a chapter into NARRATION and DIALOGUE segments.
    Applies speed rate and volume variations according to emotion/scene type.
    """
    normalized_text = text.replace("“", '"').replace("”", '"')
    parts = normalized_text.split('"')
    
    segments = []
    for i, part in enumerate(parts):
        text_content = part.strip()
        if not text_content:
            continue
            
        # Determine segment type
        is_dialogue = (i % 2 != 0)
        
        if not is_dialogue:
            # Narration
            speaker = "Narrator"
            voice = character_voices.get("Narrator", "en-US-AndrewNeural")
        else:
            # Dialogue speaker attribution
            preceding = parts[i-1] if i > 0 else ""
            succeeding = parts[i+1] if i < len(parts) - 1 else ""
            
            speaker = find_attributed_speaker_in_context(preceding, succeeding) or "Narrator"
            voice = character_voices.get(speaker, character_voices.get("Narrator", "en-US-AndrewNeural"))
            
        # Detect emotional scene parameters (rate & volume)
        rate, volume = detect_emotion_parameters(text_content, speaker, is_dialogue)
        
        segments.append({
            "type": "dialogue" if is_dialogue else "narration",
            "speaker": speaker,
            "text": text_content,
            "voice": voice,
            "rate": rate,
            "volume": volume
        })
        
    return segments

def detect_emotion_parameters(text: str, speaker: str, is_dialogue: bool) -> Tuple[str, str]:
    """
    Keyword analysis to simulate emotional pacing via TTS speed (rate) and volume adjustments.
    """
    text_lower = text.lower()
    
    # Scene keywords
    tense_keywords = ["screamed", "ran", "burst", "explosion", "rushed", "attacked", "danger", "fire", "panic", "hurry", "sprinted", "fled"]
    sad_keywords = ["cried", "wept", "grief", "loss", "died", "funeral", "tears", "sorrow", "mourned", "pain", "sad", "sobbing", "lonely"]
    whisper_words = ["whispered", "murmured", "breathed softly", "muttered", "quietly", "softly", "hushed"]
    
    # 1. Whispers (highest priority)
    if any(word in text_lower for word in whisper_words):
        return "-15%", "-20%"
        
    # 2. Tense/Action
    if any(word in text_lower for word in tense_keywords):
        return "+15%", "+0%"
        
    # 3. Sad/Somber
    if any(word in text_lower for word in sad_keywords):
        return "-10%", "+0%"
        
    # 4. Excited Dialogue (ends in exclamation)
    if is_dialogue and text.endswith("!"):
        return "+10%", "+0%"
        
    # Default normal narration/dialogue
    return "+0%", "+0%"
