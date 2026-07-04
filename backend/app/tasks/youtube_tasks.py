import uuid
import random
from datetime import datetime, timedelta
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.models import ConnectedAccount, DailySnapshot
from app.services.youtube_service import fetch_channel_stats

@celery_app.task(name="app.tasks.youtube_tasks.backfill_historical_data")
def backfill_historical_data(account_id: str):
    """
    Backfills 30 days of mock historical data for a newly connected account
    so the growth charts are populated immediately.
    """
    db = SessionLocal()
    try:
        account = db.query(ConnectedAccount).filter(ConnectedAccount.id == account_id).first()
        if not account:
            return f"Account {account_id} not found."

        # Fetch the current stats as the baseline (or day 0)
        current_stats = fetch_channel_stats(account.oauth_token)
        
        current_followers = current_stats["subscribers"]
        current_views = current_stats["views"]
        
        # We will generate 30 days going backwards
        # and slowly decrease the followers/views to simulate growth
        snapshots = []
        now = datetime.utcnow()
        
        for i in range(1, 31):
            past_date = now - timedelta(days=i)
            # Subtract some random amount to simulate past state
            followers = max(0, current_followers - int(current_followers * (0.001 * i * random.uniform(0.5, 1.5))))
            views = max(0, current_views - int(current_views * (0.005 * i * random.uniform(0.5, 1.5))))
            
            snapshot = DailySnapshot(
                connected_account_id=account.id,
                date=past_date,
                followers=followers,
                views=views,
                likes=int(views * 0.05),
                comments=int(views * 0.005)
            )
            snapshots.append(snapshot)
            
        db.bulk_save_objects(snapshots)
        db.commit()
        return f"Successfully backfilled 30 days for account {account_id}"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


@celery_app.task(name="app.tasks.youtube_tasks.daily_sync_all_accounts")
def daily_sync_all_accounts():
    """
    Runs daily to fetch the latest stats for all connected YouTube accounts
    and stores them as a new DailySnapshot.
    """
    db = SessionLocal()
    try:
        accounts = db.query(ConnectedAccount).all()
        synced_count = 0
        now = datetime.utcnow()
        
        for account in accounts:
            try:
                stats = fetch_channel_stats(account.oauth_token)
                
                # Create a new snapshot for today
                snapshot = DailySnapshot(
                    connected_account_id=account.id,
                    date=now,
                    followers=stats.get("subscribers", 0),
                    views=stats.get("views", 0),
                    likes=0,
                    comments=0
                )
                db.add(snapshot)
                
                # Update last synced time
                account.last_synced_at = now
                synced_count += 1
            except Exception as e:
                # Log error but continue with other accounts
                print(f"Failed to sync account {account.id}: {e}")
                
        db.commit()
        return f"Successfully synced {synced_count}/{len(accounts)} accounts."
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
