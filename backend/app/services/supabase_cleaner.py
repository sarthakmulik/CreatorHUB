import os
import logging
from supabase import create_client
from typing import List

logger = logging.getLogger(__name__)

def delete_media_from_supabase(file_urls: List[str]):
    """
    Deletes the provided list of media URLs from the 'scheduled_posts' bucket.
    Should be run as a background task so it doesn't block API requests.
    """
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        logger.warning("Supabase credentials not found. Skipping file deletion.")
        return

    # Ensure URL is the base URL without /rest/v1/ for the storage client to work
    url = url.replace("/rest/v1/", "").rstrip("/")
    supabase = create_client(url, key)

    paths_to_delete = []
    for single_url in file_urls:
        if not single_url:
            continue
        single_url = single_url.strip()
        if "scheduled_posts/" in single_url:
            try:
                file_path = single_url.split("scheduled_posts/")[1]
                paths_to_delete.append(file_path)
            except Exception as e:
                logger.error(f"Error parsing file path from URL {single_url}: {e}")

    if paths_to_delete:
        try:
            res = supabase.storage.from_("scheduled_posts").remove(paths_to_delete)
            logger.info(f"Deleted {len(paths_to_delete)} file(s) from Supabase: {paths_to_delete}")
        except Exception as e:
            logger.error(f"Failed to delete files from Supabase {paths_to_delete}: {e}")
