"""
scheduler.py — Background scheduler for CreatorHub.

Uses AsyncIOScheduler (APScheduler 3.x) so that all async uploader code
runs on the SAME event loop as Uvicorn/FastAPI. This is the correct
architecture — using BackgroundScheduler + asyncio.run() inside a running
Uvicorn process causes event-loop conflicts and silent failures.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import ScheduledPost, ScheduledPostStatus

logger = logging.getLogger(__name__)

MAX_RETRIES = 3  # How many times to retry a failed post before giving up


async def check_and_publish_posts():
    """
    Checks the database for any scheduled posts that are due to be published.
    Runs as a native async function on the FastAPI event loop — no asyncio.run() needed.
    """
    from app.services.instagram_uploader import publish_to_instagram_api
    from app.services.youtube_uploader import upload_to_youtube_natively
    from app.models.models import ConnectedAccount, PlatformEnum

    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        # Find queued posts that are due, lock them to prevent other workers from grabbing them
        due_posts = db.query(ScheduledPost).filter(
            ScheduledPost.status == ScheduledPostStatus.queued,
            ScheduledPost.scheduled_time <= now
        ).with_for_update(skip_locked=True).all()

        if not due_posts:
            db.rollback()
            return

        # Mark as processing
        processing_posts = []
        for post in due_posts:
            meta = dict(post.platform_metadata or {})
            if meta.get("_is_processing"):
                continue
            meta["_is_processing"] = True
            post.platform_metadata = meta
            processing_posts.append(post)
            
        if not processing_posts:
            db.rollback()
            return
            
        db.commit() # Commit the processing flag and release the row lock

        logger.info(f"Scheduler found {len(processing_posts)} post(s) to publish.")

        for post in processing_posts:
            logger.info(f"Publishing scheduled post {post.id} → platforms: {post.target_platforms}")

            success = True
            errors = []

            # ── Instagram ─────────────────────────────────────────────────────
            if "instagram" in post.target_platforms:
                account = db.query(ConnectedAccount).filter_by(
                    user_id=post.user_id,
                    platform=PlatformEnum.instagram
                ).first()

                if account and account.oauth_token:
                    try:
                        await publish_to_instagram_api(post, account)
                        logger.info(f"✅ Instagram published for post {post.id}")
                    except Exception as e:
                        logger.exception(f"❌ Instagram failed for post {post.id}: {repr(e)}")
                        success = False
                        errors.append(f"instagram: {e}")
                else:
                    logger.error(f"No Instagram account/token for user {post.user_id}")
                    success = False
                    errors.append("instagram: no connected account")

            # ── YouTube ───────────────────────────────────────────────────────
            if "youtube" in post.target_platforms:
                meta = post.platform_metadata or {}
                if meta.get("_youtube_uploaded"):
                    logger.info(f"✅ YouTube already uploaded for post {post.id} (native scheduling)")
                else:
                    account = db.query(ConnectedAccount).filter_by(
                        user_id=post.user_id,
                        platform=PlatformEnum.youtube
                    ).first()

                    if account and account.refresh_token:
                        try:
                            import asyncio
                            loop = asyncio.get_event_loop()
                            await loop.run_in_executor(
                                None,
                                upload_to_youtube_natively,
                                str(post.id)
                            )
                            logger.info(f"✅ YouTube published for post {post.id}")
                        except Exception as e:
                            logger.exception(f"❌ YouTube failed for post {post.id}: {repr(e)}")
                            success = False
                            errors.append(f"youtube: {e}")
                    else:
                        logger.error(f"No YouTube account/refresh token for user {post.user_id}")
                        success = False
                        errors.append("youtube: no connected account")

            # ── TikTok ────────────────────────────────────────────────────────
            if "tiktok" in post.target_platforms:
                account = db.query(ConnectedAccount).filter_by(
                    user_id=post.user_id,
                    platform=PlatformEnum.tiktok
                ).first()

                if account and account.oauth_token:
                    try:
                        from app.services.tiktok_uploader import publish_to_tiktok_api
                        publish_id = await publish_to_tiktok_api(post, account)
                        logger.info(f"✅ TikTok published for post {post.id} (publish_id: {publish_id})")
                    except Exception as e:
                        logger.exception(f"❌ TikTok failed for post {post.id}: {repr(e)}")
                        success = False
                        errors.append(f"tiktok: {e}")
                else:
                    logger.error(f"No TikTok account/token for user {post.user_id}")
                    success = False
                    errors.append("tiktok: no connected account")

            # ── Update Status ─────────────────────────────────────────────────
            # Remove processing flag
            meta = dict(post.platform_metadata or {})
            meta.pop("_is_processing", None)
            
            if success:
                post.status = ScheduledPostStatus.published
                post.platform_metadata = meta
                logger.info(f"✅ Post {post.id} marked as published.")
                
                # Instantly trigger API sync so the dashboard updates immediately!
                import asyncio
                asyncio.create_task(sync_all_accounts())
            else:
                retry_count = meta.get("_retry_count", 0) + 1
                meta["_retry_count"] = retry_count
                meta["_last_error"] = "; ".join(errors)
                post.platform_metadata = meta

                if retry_count >= MAX_RETRIES:
                    post.status = ScheduledPostStatus.failed
                    logger.error(
                        f"❌ Post {post.id} permanently failed after {retry_count} retries. "
                        f"Errors: {errors}"
                    )
                else:
                    # Keep it queued so it retries next minute
                    post.status = ScheduledPostStatus.queued
                    logger.warning(
                        f"⚠️  Post {post.id} will retry (attempt {retry_count}/{MAX_RETRIES}). "
                        f"Errors: {errors}"
                    )

            db.commit()

    except Exception as e:
        logger.exception(f"Fatal error in scheduler check_and_publish_posts: {e}")
        db.rollback()
    finally:
        db.close()


async def cleanup_published_media():
    """
    Checks for posts published OR permanently failed > 5 minutes ago and deletes their high-res
    media and thumbnails from Supabase to save storage costs.
    """
    from datetime import timedelta
    from app.services.supabase_cleaner import delete_media_from_supabase

    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=5)

        old_posts = db.query(ScheduledPost).filter(
            ScheduledPost.status.in_([ScheduledPostStatus.published, ScheduledPostStatus.failed]),
            ScheduledPost.scheduled_time <= cutoff,
            # Process if either media_url or thumbnail_url exists
            (ScheduledPost.media_url.isnot(None)) | (ScheduledPost.thumbnail_url.isnot(None))
        ).all()

        for post in old_posts:
            urls_to_delete = []
            if post.media_url:
                urls_to_delete.extend([u.strip() for u in post.media_url.split(",")])
            if post.thumbnail_url:
                urls_to_delete.append(post.thumbnail_url.strip())
            
            if urls_to_delete:
                # Run the synchronous helper directly (it's safe in background APScheduler thread)
                delete_media_from_supabase(urls_to_delete)
                
            post.media_url = None
            post.thumbnail_url = None

        if old_posts:
            db.commit()

    except Exception as e:
        logger.error(f"Error in media cleanup: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler() -> AsyncIOScheduler:
    """
    Creates and starts an AsyncIOScheduler that runs on the Uvicorn event loop.
    Must be called from within an async context (e.g. FastAPI lifespan).
    """
    scheduler = AsyncIOScheduler()

    # Check and publish due posts every 30 seconds for responsiveness
    scheduler.add_job(
        check_and_publish_posts,
        trigger=IntervalTrigger(seconds=30),
        id="publish_scheduled_posts",
        name="Publish scheduled posts every 30s",
        replace_existing=True,
        max_instances=1,  # Never run two at the same time
        coalesce=True,    # If a job is missed, only run it once on recovery
    )

    scheduler.add_job(
        cleanup_published_media,
        trigger=IntervalTrigger(minutes=1),
        id="cleanup_published_media",
        name="Cleanup high-res media after 5 minutes",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        sync_all_accounts,
        trigger=IntervalTrigger(minutes=5),
        id="sync_all_accounts",
        name="Sync external API data every 5 minutes",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    
    scheduler.add_job(
        refresh_expiring_tokens,
        trigger=IntervalTrigger(days=1),
        id="refresh_expiring_tokens",
        name="Refresh tokens expiring in < 7 days",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info("✅ AsyncIOScheduler started — checking for posts every 30 seconds.")
    return scheduler

async def sync_all_accounts():
    """
    Background job that loops through all connected accounts and fetches live
    data from Instagram and YouTube to keep the local database strictly in sync
    (updating views/likes, handling manual deletions).
    """
    from app.services.instagram_service import sync_instagram_account
    from app.services.youtube_service import sync_youtube_account
    from app.models.models import ConnectedAccount, PlatformEnum
    
    db: Session = SessionLocal()
    try:
        accounts = db.query(ConnectedAccount).all()
        for acc in accounts:
            if acc.platform == PlatformEnum.instagram:
                await sync_instagram_account(db, acc)
            elif acc.platform == PlatformEnum.youtube:
                await sync_youtube_account(db, acc)
                
    except Exception as e:
        logger.error(f"Error in sync_all_accounts: {e}")
    finally:
        db.close()

async def refresh_expiring_tokens():
    from app.services.instagram_service import refresh_long_lived_token
    from app.models.models import ConnectedAccount, PlatformEnum
    from datetime import timedelta
    
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        threshold = now + timedelta(days=7)
        accounts = db.query(ConnectedAccount).filter(
            ConnectedAccount.platform == PlatformEnum.instagram,
            ConnectedAccount.token_expires_at <= threshold
        ).all()
        
        for acc in accounts:
            await refresh_long_lived_token(db, acc)
    except Exception as e:
        logger.error(f"Error in refresh_expiring_tokens: {e}")
    finally:
        db.close()
