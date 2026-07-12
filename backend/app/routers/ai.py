from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

router = APIRouter(prefix="/api/ai", tags=["AI"])

class DraftReplyRequest(BaseModel):
    comment_text: str

@router.post("/draft-reply")
async def draft_reply(req: DraftReplyRequest):
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or not HAS_GEMINI:
            # Fallback mock if no API key or sdk
            return {"reply": "Thanks for your comment! (Mock AI)"}
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are a social media manager for an Indian creator. 
        Write a short, engaging, and friendly reply (in Hinglish or English) to the following comment. 
        Keep it to 1-2 sentences. 
        Comment: "{req.comment_text}"
        """
        response = model.generate_content(prompt)
        return {"reply": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CaptionRequest(BaseModel):
    topic: str
    language: str = "english" # english, hindi, hinglish

@router.post("/caption")
async def generate_caption(req: CaptionRequest):
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or not HAS_GEMINI:
            return {"caption": "Here is an amazing caption for your post! 🚀 (Mock AI - set GEMINI_API_KEY for real AI)"}
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are a viral social media manager.
        Write an Instagram Reel caption about: {req.topic}
        The language should be: {req.language}.
        Include a hook, value, and a call to action. Add relevant emojis.
        Make it sound natural and engaging.
        """
        response = model.generate_content(prompt)
        return {"caption": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
