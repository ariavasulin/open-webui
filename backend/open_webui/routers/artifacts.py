"""Artifact push endpoint for external services (e.g., Ralph)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from open_webui.socket.main import sio
from open_webui.utils.auth import get_verified_user

log = logging.getLogger(__name__)
router = APIRouter()


class ArtifactPushRequest(BaseModel):
    user_id: str
    chat_id: Optional[str] = None
    content: str  # Full HTML string
    title: Optional[str] = None


@router.post("/artifact/push")
async def push_artifact(
    form_data: ArtifactPushRequest,
    user=Depends(get_verified_user),
):
    """Push HTML content to a user's artifact panel via socket.io."""
    # Only admins or the user themselves can push artifacts
    if user.role != "admin" and user.id != form_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot push artifacts to other users",
        )

    await sio.emit(
        "events",
        {
            "chat_id": form_data.chat_id,
            "message_id": None,
            "data": {
                "type": "chat:artifact",
                "data": {
                    "content": form_data.content,
                    "title": form_data.title,
                },
            },
        },
        room=f"user:{form_data.user_id}",
    )

    return {"status": "ok"}
