import asyncio
import httpx
import logging
import json
import os
from app.models.models import ConnectedAccount, PlatformEnum
from app.services.crypto_service import decrypt_token
from app.services.media_processor import mix_audio_with_video, overlay_mentions_on_image, upload_local_file_to_supabase

logger = logging.getLogger(__name__)

async def publish_to_instagram_api(post, account: ConnectedAccount):
    """
    Publishes a post to Instagram via the Facebook Graph API.
    """
    access_token = decrypt_token(account.oauth_token)
    ig_user_id = account.platform_account_id
    
    meta = post.platform_metadata.get("instagram", {}) if post.platform_metadata else {}
    post_type = meta.get("postType", "reel").lower()
    collaborators = meta.get("collaborators", [])
    collab_json = json.dumps(collaborators) if collaborators else None
    
    custom_audio_url = meta.get("customAudioUrl")
    mentions = meta.get("mentions", [])
    
    media_urls = post.media_url.split(",") if post.media_url else []
    
    # Process Media if necessary (Reels audio or Story mentions)
    if media_urls:
        url = media_urls[0] # IG API limit: Process only the first media for now if special logic applies
        processed = False
        out_path = None
        
        if custom_audio_url and (".mp4" in url.lower() or ".mov" in url.lower()):
            logger.info(f"Mixing custom audio into video for post {post.id}...")
            out_path = await mix_audio_with_video(url, custom_audio_url)
            processed = True
            
        elif post_type == "story" and mentions and not (".mp4" in url.lower() or ".mov" in url.lower()):
            logger.info(f"Overlaying mentions onto Story image for post {post.id}...")
            # For stories, mentions are visually overlaid via Pillow
            out_path = await overlay_mentions_on_image(url, mentions)
            processed = True
            
        if processed and out_path:
            logger.info(f"Uploading processed media for post {post.id} to Supabase...")
            new_url = await upload_local_file_to_supabase(out_path)
            media_urls[0] = new_url
            if os.path.exists(out_path):
                os.remove(out_path)
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        # Helper to wait for a container to be FINISHED
        async def wait_for_container(creation_id):
            status_url = f"https://graph.facebook.com/v19.0/{creation_id}"
            max_attempts = 60 # Wait up to 5 minutes
            attempts = 0
            while attempts < max_attempts:
                status_res = await client.get(status_url, params={
                    "fields": "status_code",
                    "access_token": access_token
                })
                if status_res.status_code == 200:
                    status_code = status_res.json().get("status_code")
                    if status_code == "FINISHED" or status_code is None:
                        return
                    elif status_code == "ERROR":
                        raise Exception(f"Instagram container processing failed: {status_res.text}")
                await asyncio.sleep(5)
                attempts += 1
            raise Exception("Timeout waiting for Instagram container to finish processing")

        container_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media"
        
        if len(media_urls) > 1:
            # CAROUSEL LOGIC
            logger.info(f"Creating IG carousel child containers for post {post.id}...")
            child_ids = []
            video_cids = []
            for url in media_urls:
                if ".mp4" in url.lower() or ".mov" in url.lower():
                    payload = {
                        "media_type": "VIDEO",
                        "video_url": url,
                        "is_carousel_item": "true",
                        "access_token": access_token
                    }
                    is_video = True
                else:
                    payload = {
                        "image_url": url,
                        "is_carousel_item": "true",
                        "access_token": access_token
                    }
                    is_video = False
                    
                res = await client.post(container_url, data=payload)
                if res.status_code != 200:
                    raise Exception(f"Failed to create IG carousel item: {res.text}")
                
                cid = res.json().get("id")
                child_ids.append(cid)
                if is_video:
                    video_cids.append(cid)
                
            # Wait ONLY for video children to be ready (images are ready immediately)
            for cid in video_cids:
                await wait_for_container(cid)
                
            # Create parent container
            logger.info(f"Creating IG parent carousel container for post {post.id}...")
            parent_payload = {
                "caption": post.caption or "",
                "media_type": "CAROUSEL",
                "children": ",".join(child_ids),
                "access_token": access_token
            }
            if collab_json:
                parent_payload["collaborators"] = collab_json
                
            res = await client.post(container_url, data=parent_payload)
            if res.status_code != 200:
                error_text = res.text
                # Graceful fallback: If the collaborator's account is private, age-restricted, or doesn't allow invites,
                # Meta API rejects the entire post. We catch this and retry without the collaborator to save the post.
                if collab_json and ("tag user" in error_text.lower() or "collaborator" in error_text.lower() or "not visible" in error_text.lower() or "privacy" in error_text.lower()):
                    logger.warning(f"Collaborator rejected by Instagram for post {post.id}. Retrying without collaborators.")
                    del parent_payload["collaborators"]
                    res = await client.post(container_url, data=parent_payload)
                if res.status_code != 200:
                    raise Exception(f"Failed to create IG parent carousel container: {res.text}")
            
            creation_id = res.json().get("id")
            # Parent carousel containers do not need to be waited on, they are ready immediately
        else:
            # SINGLE MEDIA LOGIC
            url = media_urls[0] if media_urls else ""
            
            # For Feed/Reel, append mentions to the caption
            caption = post.caption or ""
            if post_type != "story" and mentions:
                caption += "\n\n" + " ".join(mentions)
                
            payload = {
                "caption": caption,
                "access_token": access_token
            }
            
            if post_type == "reel" or post_type == "video" or ".mp4" in url.lower() or ".mov" in url.lower():
                payload["media_type"] = "REELS"
                payload["video_url"] = url
                payload["share_to_feed"] = "true" if meta.get("shareToFeed", True) else "false"
            elif post_type == "story":
                payload["media_type"] = "STORIES"
                if ".mp4" in url.lower() or ".mov" in url.lower():
                    payload["video_url"] = url
                else:
                    payload["image_url"] = url
            else:
                payload["image_url"] = url
                
            if collab_json:
                payload["collaborators"] = collab_json
                
            logger.info(f"Creating IG container for post {post.id}...")
            res = await client.post(container_url, data=payload)
            if res.status_code != 200:
                error_text = res.text
                # Graceful fallback for collaborators
                if collab_json and ("tag user" in error_text.lower() or "collaborator" in error_text.lower() or "not visible" in error_text.lower() or "privacy" in error_text.lower()):
                    logger.warning(f"Collaborator rejected by Instagram for post {post.id}. Retrying without collaborators.")
                    del payload["collaborators"]
                    res = await client.post(container_url, data=payload)
                if res.status_code != 200:
                    raise Exception(f"Failed to create IG container: {res.text}")
                
            creation_id = res.json().get("id")
            # We wait for BOTH reels and images to avoid "Media ID is not available"
            await wait_for_container(creation_id)
            
        # Publish the container
        publish_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish"
        
        max_pub_retries = 3
        for attempt in range(max_pub_retries):
            pub_res = await client.post(publish_url, data={
                "creation_id": creation_id,
                "access_token": access_token
            })
            
            if pub_res.status_code == 200:
                logger.info(f"Successfully published to Instagram: {pub_res.json().get('id')}")
                return
                
            error_data = pub_res.json().get("error", {})
            error_message = error_data.get("message", "").lower()
            
            # Check if Meta actually published the container despite throwing an error
            status_res = await client.get(f"https://graph.facebook.com/v19.0/{creation_id}", params={
                "fields": "status_code",
                "access_token": access_token
            })
            if status_res.status_code == 200 and status_res.json().get("status_code") == "PUBLISHED":
                logger.info(f"Container {creation_id} was successfully published despite Meta API error.")
                return
                
            # If the error is transient, wait and retry the exact same creation_id
            if error_data.get("is_transient"):
                logger.warning(f"Transient error publishing container, retrying ({attempt+1}/{max_pub_retries})...")
                await asyncio.sleep(5 * (attempt + 1))
            else:
                break
                
        logger.error(f"IG container publish failed after retries: {pub_res.text}")
        raise Exception("Failed to publish Instagram container")
