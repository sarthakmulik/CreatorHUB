import uuid
import httpx
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, ConnectedAccount, Post, DailySnapshot, AIInsight, SubscriptionTier
from app.config import get_settings

router = APIRouter()
settings = get_settings()

@router.get("/generate")
async def generate_insights(user_id: str, db: Session = Depends(get_db)):
    """
    Generate AI insights based on the user's historical data using OpenRouter (LLM).
    """
    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is missing. Please add it to the environment.")

    # 0. Check Subscription Limits
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    tier = getattr(user.subscription_tier, "value", user.subscription_tier) if user else "free"
    if tier == "free":
        # Check how many insights generated this month
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        insights_count = db.query(AIInsight).filter(
            AIInsight.user_id == user_id,
            AIInsight.generated_at >= current_month_start
        ).count()
        
        if insights_count >= 3:
            raise HTTPException(status_code=403, detail="Free plan limit reached. Please upgrade to Pro to unlock unlimited AI insights.")

    # 1. Gather User's Historical Data
    accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user_id).all()
    if not accounts:
        raise HTTPException(status_code=400, detail="No connected accounts found.")
        
    account_ids = [acc.id for acc in accounts]
    
    # Get last 30 posts
    posts = db.query(Post).filter(Post.connected_account_id.in_(account_ids)).order_by(Post.published_at.desc()).limit(30).all()
    
    # Format data for the LLM
    post_data = []
    for p in posts:
        post_data.append({
            "title_or_caption": p.title or p.caption,
            "views": p.views,
            "likes": p.likes,
            "comments": p.comments,
            "published_at": p.published_at.isoformat() if p.published_at else None
        })
        
    prompt = f"""
    Analyze the following social media post data for a creator and generate exactly 3 insights.
    
    Data:
    {json.dumps(post_data, indent=2)}
    
    You MUST output valid JSON only. Your response must be an array of 3 objects.
    Do NOT wrap in markdown code blocks like ```json.
    
    Format:
    [
      {{
        "title": "Short title with emoji (e.g., 🚀 Best Time to Post)",
        "text": "Detailed 2-3 sentence insight.",
        "metric": "A short highlight metric (e.g., '+34% views' or '3.1x more')",
        "color": "purple" // choose from: purple, cyan, green
      }}
    ]
    """
    
    # 2. Call Google Gemini REST API directly
    async with httpx.AsyncClient(timeout=60.0) as client:
        # We use gemini-2.5-flash as it is extremely fast and completely free on the generous tier
        res = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.gemini_api_key.strip()}",
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "systemInstruction": {
                    "parts": [
                        {"text": "You are a helpful data analyst AI. Always respond in pure JSON."}
                    ]
                },
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            },
            headers={
                "Content-Type": "application/json"
            }
        )
        
        if res.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Gemini API error: {res.text}")
            
        try:
            data = res.json()
            # Extract text from Gemini's response structure
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean potential markdown wrapping just in case
            content = content.strip()
            if content.startswith("```json"): content = content[7:]
            if content.endswith("```"): content = content[:-3]
            
            insights_array = json.loads(content)
            
            # Handle case where AI wraps array in an object
            if isinstance(insights_array, dict) and "insights" in insights_array:
                insights_array = insights_array["insights"]
                
            # Add IDs and timestamps
            for idx, insight in enumerate(insights_array):
                insight["id"] = f"ai-{uuid.uuid4().hex[:8]}"
                insight["generated_at"] = datetime.utcnow().isoformat()
                
                # Save to database to track usage limit
                db_insight = AIInsight(
                    user_id=user.id,
                    insight_text=json.dumps(insight)
                )
                db.add(db_insight)
                
            db.commit()
                
            return insights_array
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse Gemini API response: {e}\nResponse was: {res.text}")
