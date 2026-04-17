"""Background tasks for subscription expiry and session cleanup.

Runs as part of the FastAPI lifespan — no external scheduler needed.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import update, select, func

from app.database import async_session
from app.models.session import Session
from app.models.user import User

logger = logging.getLogger(__name__)

CLEANUP_INTERVAL = 3600  # 1 hour


async def downgrade_expired_subscriptions() -> int:
    """Set subscription_tier to 'free' for users whose subscription has expired."""
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            update(User)
            .where(
                User.subscription_tier != "free",
                User.subscription_expires_at.isnot(None),
                User.subscription_expires_at < now,
            )
            .values(subscription_tier="free")
        )
        count = result.rowcount
        if count > 0:
            await db.commit()
            logger.info("Downgraded %d expired subscriptions to free", count)
        return count


async def cleanup_stale_sessions() -> int:
    """Mark sessions as 'stopped' if they've been active for more than 24 hours (likely orphaned)."""
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        cutoff = now.replace(hour=now.hour - 24) if now.hour >= 24 else now
        # Use interval instead
        from sqlalchemy import text
        result = await db.execute(
            update(Session)
            .where(
                Session.status == "active",
                Session.started_at < func.now() - text("interval '24 hours'"),
            )
            .values(status="stopped", ended_at=func.now())
        )
        count = result.rowcount
        if count > 0:
            await db.commit()
            logger.info("Cleaned up %d stale sessions", count)
        return count


async def background_tasks_loop():
    """Run periodic maintenance tasks."""
    logger.info("Background tasks started (interval: %ds)", CLEANUP_INTERVAL)
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL)
            await downgrade_expired_subscriptions()
            await cleanup_stale_sessions()
        except asyncio.CancelledError:
            logger.info("Background tasks stopped")
            break
        except Exception:
            logger.exception("Error in background tasks")
