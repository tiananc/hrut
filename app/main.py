from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.nlp import router as nlp_router  
from app.gen import router as gen_router
from app.entries import router as entries_router
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

app = FastAPI(
    title="hrūt.journal - Private Journal + Sentiment Analysis",
    description="A privacy-focused journaling app with sentiment analysis",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(nlp_router, prefix="/nlp", tags=["NLP"]) 
app.include_router(gen_router, prefix="/gen", tags=["Generation"])
app.include_router(entries_router, prefix="/api/entries", tags=["Entries"])

# Health check endpoint
@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "hrūt.journal",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "hrūt.journal API",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )