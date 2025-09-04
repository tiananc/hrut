from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
import logging

router = APIRouter()

# Initialize sentiment analyzer
try:
    _analyzer = SentimentIntensityAnalyzer()
    logging.info("VADER sentiment analyzer initialized")
except Exception as e:
    logging.error(f"Failed to initialize sentiment analyzer: {e}")
    _analyzer = None

# Enhanced emotion detection with more nuanced categories
EMOTION_MAP = {
    "joy": ["happy", "joy", "joyful", "glad", "cheerful", "delighted", "elated", "excited", "thrilled", "blissful", "ecstatic", "upbeat"],
    "gratitude": ["grateful", "thankful", "blessed", "appreciative", "fortunate"],
    "pride": ["proud", "accomplished", "achieved", "successful", "confident"],
    "calm": ["calm", "peace", "peaceful", "relaxed", "serene", "tranquil", "steady", "centered", "balanced"],
    "love": ["love", "loving", "affection", "care", "caring", "tender", "warm", "heart"],
    "hope": ["hope", "hopeful", "optimistic", "positive", "bright", "promising", "encouraged"],
    
    "stress": ["stress", "stressed", "pressure", "overwhelm", "overwhelmed", "tense", "strained", "burden", "hectic"],
    "anxiety": ["anxious", "anxiety", "worried", "nervous", "restless", "uneasy", "concerned", "apprehensive"],
    "sadness": ["sad", "down", "blue", "lonely", "melancholy", "gloomy", "dejected", "sorrowful", "grief"],
    "anger": ["angry", "mad", "frustrated", "irritated", "annoyed", "furious", "rage", "resentful"],
    "fear": ["afraid", "scared", "fear", "fearful", "terrified", "panic", "dread"],
    "disappointment": ["disappointed", "letdown", "discouraged", "disillusioned", "defeated"],
    "guilt": ["guilty", "shame", "ashamed", "regret", "remorse"],
    "confusion": ["confused", "lost", "uncertain", "unclear", "puzzled", "bewildered"],
    
    "tired": ["tired", "exhausted", "drained", "weary", "fatigue", "sleepy"],
    "energetic": ["energetic", "energized", "vibrant", "lively", "dynamic", "motivated"]
}

# Enhanced theme detection with more life categories
THEME_MAP = {
    "work": ["work", "job", "office", "meeting", "deadline", "project", "task", "boss", "colleague", "career", "professional", "business", "client"],
    "family": ["family", "mom", "dad", "mother", "father", "parent", "kids", "children", "sibling", "brother", "sister", "spouse", "partner", "husband", "wife"],
    "relationships": ["relationship", "friend", "friendship", "date", "dating", "partner", "love", "romantic", "social", "connection"],
    "health": ["health", "exercise", "workout", "gym", "run", "running", "walk", "walking", "sleep", "diet", "nutrition", "doctor", "medical", "sick", "illness"],
    "personal_growth": ["learn", "learning", "growth", "develop", "development", "improve", "improvement", "goal", "goals", "achievement", "progress", "challenge"],
    "home": ["home", "house", "apartment", "room", "kitchen", "living", "bedroom", "clean", "organize", "domestic"],
    "money": ["money", "budget", "finance", "financial", "pay", "paid", "salary", "bill", "bills", "rent", "expense", "cost", "afford"],
    "education": ["study", "studying", "class", "school", "university", "college", "course", "exam", "homework", "lecture", "grade"],
    "hobbies": ["hobby", "hobbies", "art", "music", "reading", "book", "movie", "game", "sport", "creative", "craft"],
    "travel": ["travel", "trip", "vacation", "holiday", "flight", "hotel", "explore", "adventure", "journey"],
    "nature": ["nature", "park", "outdoor", "weather", "sun", "rain", "tree", "flowers", "garden", "beach", "mountain"],
    "technology": ["computer", "phone", "internet", "app", "software", "digital", "online", "tech"],
    "food": ["food", "eat", "eating", "restaurant", "cook", "cooking", "meal", "breakfast", "lunch", "dinner", "recipe"]
}

class TextIn(BaseModel):
    text: str

class AnalysisOut(BaseModel):
    sentiment: str
    intensity: int
    emotions: list[str]
    themes: list[str]
    confidence: float

def preprocess_text(text: str) -> str:
    """Clean and preprocess text for analysis"""
    if not text:
        return ""
    
    # Convert to lowercase for analysis
    text = text.lower().strip()
    
    # Remove excessive punctuation but keep sentence structure
    text = re.sub(r'[!]{2,}', '!', text)
    text = re.sub(r'[?]{2,}', '?', text)
    text = re.sub(r'\.{3,}', '...', text)
    
    return text

def detect_emotions(text: str, max_emotions: int = 4) -> list[str]:
    """Detect emotions based on keyword matching with scoring"""
    text_lower = text.lower().strip()
    emotion_scores = {}
    
    # Split text into words for better matching
    words = re.findall(r'\b\w+\b', text_lower)
    
    for emotion, keywords in EMOTION_MAP.items():
        score = 0
        for keyword in keywords:
            # Check for exact word matches (more accurate than substring matching)
            if keyword in words:
                # For short entries, give higher weight to direct matches
                weight = 2.0 if len(words) <= 5 else 1.0 + (len(keyword) / 10.0)
                score += weight
            # Also check substring matches for compound words
            elif keyword in text_lower:
                weight = 1.0 + (len(keyword) / 10.0)
                score += weight * 0.5
        
        if score > 0:
            emotion_scores[emotion] = score
    
    # Return top emotions sorted by score
    sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)
    return [emotion for emotion, _ in sorted_emotions[:max_emotions]]

def detect_themes(text: str, max_themes: int = 3) -> list[str]:
    """Detect themes with improved scoring"""
    text_lower = text.lower().strip()
    theme_scores = {}
    
    # Split text into words for better matching
    words = re.findall(r'\b\w+\b', text_lower)
    
    for theme, keywords in THEME_MAP.items():
        score = 0
        for keyword in keywords:
            # Check for exact word matches (more accurate than substring matching)
            if keyword in words:
                # For short entries, give higher weight to direct matches
                weight = 2.0 if len(words) <= 5 else 1.0 + (len(keyword) / 10.0)
                score += weight
            # Also check substring matches for compound words
            elif keyword in text_lower:
                weight = 1.0 + (len(keyword) / 10.0)
                score += weight * 0.5
        
        if score > 0:
            theme_scores[theme] = score
    
    # Return top themes sorted by score
    sorted_themes = sorted(theme_scores.items(), key=lambda x: x[1], reverse=True)
    return [theme for theme, _ in sorted_themes[:max_themes]]

def analyze_sentiment(text: str) -> tuple[str, int, float]:
    """Analyze sentiment using VADER with enhanced classification"""
    if not _analyzer:
        return "neutral", 2, 0.5
    
    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]
    
    # More nuanced sentiment classification
    if compound >= 0.3:
        sentiment = "positive"
        intensity = min(5, max(3, int((compound + 0.3) * 5)))
    elif compound <= -0.3:
        sentiment = "negative" 
        intensity = min(5, max(3, int(abs(compound + 0.3) * 5)))
    else:
        sentiment = "neutral"
        intensity = max(1, int((abs(compound) + 0.1) * 3))
    
    # Calculate confidence based on how clear the sentiment is
    confidence = min(0.95, max(0.5, abs(compound) * 2))
    
    return sentiment, intensity, confidence

@router.post("/analyze", response_model=AnalysisOut)
def analyze_text(payload: TextIn):
    """Analyze text for sentiment, emotions, and themes"""
    if not payload.text or not payload.text.strip():
        raise HTTPException(400, "Text cannot be empty")
    
    try:
        # Preprocess the text
        processed_text = preprocess_text(payload.text)
        
        if not processed_text:
            raise HTTPException(400, "Text contains no analyzable content")
        
        # Analyze sentiment
        sentiment, intensity, confidence = analyze_sentiment(processed_text)
        
        # Detect emotions and themes
        emotions = detect_emotions(processed_text)
        themes = detect_themes(processed_text)
        
        # Log for debugging
        logging.info(f"Analysis: text='{processed_text[:50]}...', sentiment={sentiment}, emotions={emotions}, themes={themes}")
        
        return AnalysisOut(
            sentiment=sentiment,
            intensity=intensity,
            emotions=emotions,
            themes=themes,
            confidence=confidence
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Text analysis failed: {e}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")

@router.get("/emotions")
def get_available_emotions():
    """Get list of all detectable emotions"""
    return {
        "emotions": list(EMOTION_MAP.keys()),
        "total_count": len(EMOTION_MAP)
    }

@router.get("/themes") 
def get_available_themes():
    """Get list of all detectable themes"""
    return {
        "themes": list(THEME_MAP.keys()),
        "total_count": len(THEME_MAP)
    }

@router.get("/status")
def get_nlp_status():
    """Get NLP service status"""
    return {
        "sentiment_analyzer_available": _analyzer is not None,
        "supported_emotions": len(EMOTION_MAP),
        "supported_themes": len(THEME_MAP)
    }

@router.post("/test")
def test_analysis(payload: TextIn):
    """Test endpoint for debugging analysis"""
    processed_text = preprocess_text(payload.text)
    words = re.findall(r'\b\w+\b', processed_text.lower())
    
    # Test emotion detection
    emotions = detect_emotions(processed_text)
    themes = detect_themes(processed_text)
    sentiment, intensity, confidence = analyze_sentiment(processed_text)
    
    return {
        "original_text": payload.text,
        "processed_text": processed_text,
        "words_extracted": words,
        "detected_emotions": emotions,
        "detected_themes": themes,
        "sentiment": sentiment,
        "intensity": intensity,
        "confidence": confidence
    }