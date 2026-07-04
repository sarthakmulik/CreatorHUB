from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
import hmac
import hashlib
import json
import logging
import razorpay

from app.database import get_db
from app.models.models import User, SubscriptionTier
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Initialize Razorpay Client
razorpay_client = None
if settings.razorpay_key_id and settings.razorpay_key_secret:
    razorpay_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

# PRICING CONFIG (INR)
PLANS = {
    "pro_monthly": {"name": "Pro Monthly", "amount": 49900, "tier": SubscriptionTier.pro},   # amounts are in paise (x100)
    "pro_yearly": {"name": "Pro Yearly", "amount": 499900, "tier": SubscriptionTier.pro},
    "elite_monthly": {"name": "Elite Monthly", "amount": 149900, "tier": SubscriptionTier.elite},
    "elite_yearly": {"name": "Elite Yearly", "amount": 1499900, "tier": SubscriptionTier.elite},
}

class CreateOrderRequest(BaseModel):
    plan_id: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.get("/plans")
def get_plans():
    return {"plans": PLANS}

@router.get("/me")
def get_my_tier(db: Session = Depends(get_db), user_id: str = Query(...)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"tier": "free"}
    return {"tier": getattr(user.subscription_tier, "value", user.subscription_tier)}

@router.post("/create-order")
async def create_order(req: CreateOrderRequest, db: Session = Depends(get_db), user_id: str = Query(...)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
        
    if req.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan_id")
        
    plan = PLANS[req.plan_id]
    
    import time
    # Create Razorpay Order
    data = {
        "amount": plan["amount"],
        "currency": "INR",
        "receipt": f"r_{int(time.time())}_{str(user_id)[:8]}",
        "notes": {
            "user_id": str(user_id),
            "tier": plan["tier"].value
        }
    }
    
    try:
        order = razorpay_client.order.create(data=data)
        return {
            "order_id": order["id"], 
            "amount": order["amount"], 
            "currency": order["currency"],
            "key_id": settings.razorpay_key_id
        }
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")

@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest, db: Session = Depends(get_db), user_id: str = Query(...)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
        
    try:
        # Verify Signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        })
        
        # Fetch order details from Razorpay to know what they bought
        order = razorpay_client.order.fetch(req.razorpay_order_id)
        tier_value = order.get("notes", {}).get("tier")
        
        if not tier_value:
             raise HTTPException(status_code=400, detail="Order is missing tier metadata")
             
        # Update User in DB
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.subscription_tier = tier_value
            # Save customer IDs for future reference/refunds
            db.commit()
            
        return {"status": "success", "message": "Payment verified and tier upgraded", "new_tier": tier_value}
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None), db: Session = Depends(get_db)):
    if not settings.razorpay_webhook_secret:
        return {"status": "ignored"}
        
    payload = await request.body()
    
    try:
        razorpay_client.utility.verify_webhook_signature(
            payload.decode("utf-8"), 
            x_razorpay_signature, 
            settings.razorpay_webhook_secret
        )
    except Exception as e:
        logger.warning(f"Webhook signature mismatch: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = json.loads(payload)
    event = data.get("event")
    
    # Handle subscription events (for recurring billing)
    # e.g., 'subscription.charged', 'subscription.halted', 'subscription.cancelled'
    if event == "subscription.cancelled":
        # extract user/sub details and downgrade to free
        pass
        
    return {"status": "ok"}
