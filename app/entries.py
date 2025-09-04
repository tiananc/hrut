from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal, List, Optional
from datetime import datetime, date
import uuid
import logging

router = APIRouter()

class Analysis(BaseModel):
    sentiment: Literal["positive","neutral","negative"] = "neutral"
    intensity: int = 2
    emotions: list[str] = []
    themes: list[str] = []

class Note(BaseModel):
    id: str
    createdAt: str
    text: str
    analysis: Analysis

class TextEntryIn(BaseModel):
    text: str
    createdAt: str | None = None
    analysis: Optional[Analysis] = None

# In-memory storage (replace with database in production)
NOTES: list[Note] = []

def parse_iso(s: str) -> date: 
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, f"Invalid date format: {s}. Expected YYYY-MM-DD")

def iso(d: date) -> str: 
    return d.strftime("%Y-%m-%d")

def filter_notes_by_scope(notes: List[Note], scope: str, target_date: date) -> List[Note]:
    """Filter notes based on scope and date"""
    from datetime import timedelta
    
    if scope == "summary" or scope == "year":
        # Return all notes from the same year
        return [n for n in notes if parse_iso(n.createdAt).year == target_date.year]
    
    elif scope == "month":
        # Return notes from the same month
        return [n for n in notes if (
            parse_iso(n.createdAt).year == target_date.year and 
            parse_iso(n.createdAt).month == target_date.month
        )]
    
    elif scope == "week":
        # Return notes from the same week (Monday to Sunday)
        from datetime import timedelta
        
        # Find the start of the week (Monday)
        days_since_monday = target_date.weekday()
        week_start = target_date - timedelta(days=days_since_monday)
        week_end = week_start + timedelta(days=6)
        
        return [n for n in notes if week_start <= parse_iso(n.createdAt) <= week_end]
    
    elif scope == "day":
        # Return notes from the same day
        return [n for n in notes if parse_iso(n.createdAt) == target_date]
    
    else:
        return notes

@router.get("", response_model=List[Note])
def get_entries(
    scope: Literal["summary","year","month","week","day"] = Query(...), 
    date: str = Query(...)
):
    """Get entries filtered by scope and date"""
    try:
        target_date = parse_iso(date)
    except ValueError:
        raise HTTPException(400, f"Invalid date format: {date}")
    
    # Filter notes by scope
    filtered_notes = filter_notes_by_scope(NOTES, scope, target_date)
    
    # Sort by date (newest first)
    return sorted(filtered_notes, key=lambda n: n.createdAt, reverse=True)

@router.post("/text", response_model=Note, status_code=201)
def add_text_entry(payload: TextEntryIn):
    """Add a new text entry with sentiment analysis"""
    if not payload.text.strip():
        raise HTTPException(400, "Entry text cannot be empty")
    
    # Parse or default the creation date
    try:
        created = parse_iso(payload.createdAt) if payload.createdAt else date.today()
    except ValueError:
        raise HTTPException(400, f"Invalid date format: {payload.createdAt}")
    
    # Use provided analysis or create default
    analysis = payload.analysis or Analysis(
        sentiment="neutral",
        intensity=2,
        emotions=[],
        themes=[]
    )
    
    # Create the note
    note = Note(
        id=str(uuid.uuid4())[:8],
        createdAt=iso(created),
        text=payload.text.strip(),
        analysis=analysis,
    )
    
    # Add to storage (insert at beginning for newest-first ordering)
    NOTES.insert(0, note)
    
    logging.info(f"Created new entry {note.id} with sentiment: {analysis.sentiment}")
    return note

@router.get("/stats")
def get_stats():
    """Get overall statistics about entries"""
    if not NOTES:
        return {
            "total_entries": 0,
            "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
            "top_emotions": [],
            "top_themes": [],
            "date_range": None
        }
    
    # Calculate sentiment breakdown
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
    all_emotions = []
    all_themes = []
    
    for note in NOTES:
        sentiment_counts[note.analysis.sentiment] += 1
        all_emotions.extend(note.analysis.emotions)
        all_themes.extend(note.analysis.themes)
    
    # Count emotion and theme frequencies
    from collections import Counter
    emotion_counter = Counter(all_emotions)
    theme_counter = Counter(all_themes)
    
    # Get date range
    dates = [parse_iso(n.createdAt) for n in NOTES]
    date_range = {
        "earliest": iso(min(dates)),
        "latest": iso(max(dates))
    } if dates else None
    
    return {
        "total_entries": len(NOTES),
        "sentiment_breakdown": sentiment_counts,
        "top_emotions": emotion_counter.most_common(10),
        "top_themes": theme_counter.most_common(10),
        "date_range": date_range
    }

def create_august_sample_data():
    """Create sample entries from August 15-30th using real journal prompts"""
    if NOTES: 
        return
    
    sample_entries = [
        {
            "text": "My family was the most salient part of my day, since most days the care of my 2 children occupies the majority of my time. They are 2 years old and 7 months and I love them, but they also require so much attention that my anxiety is higher than ever. I am often overwhelmed by the care they require, but at the same time, I am so excited to see them hit developmental and social milestones.",
            "createdAt": "2025-08-15",
            "analysis": Analysis(sentiment="neutral", intensity=3, emotions=["anxiety", "love", "stress"], themes=["family"])
        },
        {
            "text": "Yesterday, I finished two of the requirements for the semester. I felt relieved because the requirements were hindering me from writing my MA thesis. Now I can focus on my research and writing without these distractions.",
            "createdAt": "2025-08-16", 
            "analysis": Analysis(sentiment="positive", intensity=4, emotions=["pride", "calm"], themes=["education", "personal_growth"])
        },
        {
            "text": "Yesterday was a very productive day at work for me. I finished all of my work for my real-world job very quickly, and was able to also make over $100 from my side projects. Feeling accomplished and financially motivated.",
            "createdAt": "2025-08-17",
            "analysis": Analysis(sentiment="positive", intensity=4, emotions=["pride", "joy"], themes=["work", "money"])
        },
        {
            "text": "Yesterday my children and grandchildren came over for a cookout. I had not seen them all together for a few weeks so it was great to get them all together. We grilled burgers and played games in the backyard.",
            "createdAt": "2025-08-18",
            "analysis": Analysis(sentiment="positive", intensity=4, emotions=["joy", "love"], themes=["family", "food"])
        },
        {
            "text": "Yesterday I went for a walk with a friend. About a mile into our walk it started pouring down rain. We were soaked before we made it back to the car, but we laughed the whole way. Sometimes the unexpected moments are the most fun.",
            "createdAt": "2025-08-19",
            "analysis": Analysis(sentiment="positive", intensity=3, emotions=["joy", "calm"], themes=["relationships", "health", "nature"])
        },
        {
            "text": "Yesterday I had to go to the dentist and was worried about my oral health. You see, 3 months ago, when I went for my teeth cleaning, the checkup was not good. But today the dentist said my gums look much better and I'm on the right track.",
            "createdAt": "2025-08-20",
            "analysis": Analysis(sentiment="positive", intensity=3, emotions=["anxiety", "hope"], themes=["health"])
        },
        {
            "text": "Work was long today. I did a lot of different projects at 2 different stores. It was frustrating some of the time, but the fact that I finished everything I set out to do made me feel accomplished by the end of the day.",
            "createdAt": "2025-08-21",
            "analysis": Analysis(sentiment="neutral", intensity=3, emotions=["stress", "pride"], themes=["work"])
        },
        {
            "text": "When nothing goes right I know God is there with me. He is there to lift me up. He's always there to talk to and never judges me. I love him and always will. Faith gives me strength during difficult times.",
            "createdAt": "2025-08-22",
            "analysis": Analysis(sentiment="positive", intensity=4, emotions=["hope", "love", "calm"], themes=["personal_growth"])
        },
        {
            "text": "Was able to meet up with my girlfriend after a week of not seeing her. I was very excited to spend time together and catch up on everything that happened while we were apart. We went to our favorite restaurant.",
            "createdAt": "2025-08-23",
            "analysis": Analysis(sentiment="positive", intensity=4, emotions=["joy", "love"], themes=["relationships", "food"])
        },
        {
            "text": "Today we had a snow day or shall I be more specific; we had an ice day! There was a layer of slick ice that coated all outdoor surfaces so my children couldn't go to school. We made hot chocolate and watched movies all day.",
            "createdAt": "2025-08-24",
            "analysis": Analysis(sentiment="positive", intensity=3, emotions=["joy", "calm"], themes=["family", "nature", "home"])
        },
        {
            "text": "Today I was very sick. It seems everybody I know has a cold and I thought I was above it but no. I had some orange juice and went back to bed. Not a good day but hoping tomorrow will be better.",
            "createdAt": "2025-08-25",
            "analysis": Analysis(sentiment="negative", intensity=2, emotions=["tired", "hope"], themes=["health"])
        },
        {
            "text": "This would be kayaking with my dog. There is nothing more peaceful than taking the boat out on the water with my best pal and just enjoying the peace and quiet. The water was calm and the weather perfect.",
            "createdAt": "2025-08-26",
            "analysis": Analysis(sentiment="positive", intensity=5, emotions=["calm", "joy"], themes=["nature", "hobbies"])
        },
        {
            "text": "The most salient thing I felt yesterday was loving life. I for the most part feel blessed in all that I have accomplished in life and am very grateful for my family, friends, and opportunities.",
            "createdAt": "2025-08-27",
            "analysis": Analysis(sentiment="positive", intensity=5, emotions=["gratitude", "joy", "love"], themes=["personal_growth", "family", "relationships"])
        },
        {
            "text": "The kids had a half day at school and went for a hang out at different friend's homes. I picked them up after work and both friends are from affluent families. It made me reflect on what we can provide versus what others have.",
            "createdAt": "2025-08-28",
            "analysis": Analysis(sentiment="neutral", intensity=2, emotions=["confusion"], themes=["family", "money"])
        },
        {
            "text": "Spending time with my wife after work is the most precious event of the day. Making our dinner together and catching up on things during cooking time. These quiet moments together mean everything to me.",
            "createdAt": "2025-08-29",
            "analysis": Analysis(sentiment="positive", intensity=5, emotions=["love", "gratitude", "calm"], themes=["relationships", "food", "home"])
        }
    ]
    
    for entry_data in sample_entries:
        note = Note(
            id=str(uuid.uuid4())[:8],
            createdAt=entry_data["createdAt"],
            text=entry_data["text"],
            analysis=entry_data["analysis"]
        )
        NOTES.append(note)
    
    logging.info(f"Created {len(sample_entries)} sample entries from August 15-30th")

# Call this function at the end of your entries.py file instead of create_sample_data()
# create_august_sample_data()