from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


async def create_notification(
    db: Session,
    *,
    recipient_id: str,
    actor_id: str | None,
    workspace_id: str,
    project_id: str,
    task_id: str | None,
    type: NotificationType,
    payload: dict,
) -> Notification | None:
    # Don't notify someone about their own action (e.g. self-assignment,
    # self-mention while editing your own description).
    if actor_id and str(actor_id) == str(recipient_id):
        return None

    notif = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        workspace_id=workspace_id,
        project_id=project_id,
        task_id=task_id,
        type=type,
        payload=payload,
    )
    db.add(notif)
    db.flush()

    try:
        from app.core.events import build_event
        from app.core.websocket_manager import manager
        from datetime import datetime, timezone
        
        created_at_val = notif.created_at.isoformat() if notif.created_at else datetime.now(timezone.utc).isoformat()
        
        event_payload = {
            "id": str(notif.id),
            "recipient_id": str(notif.recipient_id),
            "actor_id": str(notif.actor_id) if notif.actor_id else None,
            "type": notif.type.value,
            "payload": notif.payload,
            "task_id": str(notif.task_id) if notif.task_id else None,
            "is_read": notif.is_read,
            "created_at": created_at_val,
        }
        
        event = build_event("notification", str(project_id), event_payload, actor_id or "")
        await manager.publish_to_user(str(recipient_id), event)
    except Exception as e:
        # Avoid failing the transaction if real-time push fails
        import logging
        logging.getLogger(__name__).exception("Failed to publish real-time notification")

    return notif


def extract_mentioned_user_ids(tiptap_json: dict) -> set[str]:
    """
    Walk TipTap JSON doc, collect user IDs from @mention nodes.
    Reuses the same mention node shape your Week 4 editor already produces
    — assumed node type "mention" with attrs.id. Adjust the type/attr key
    below if your mention extension names them differently.
    """
    found = set()

    def walk(node):
        if not isinstance(node, dict):
            return
        if node.get("type") == "mention":
            user_id = node.get("attrs", {}).get("id")
            if user_id:
                found.add(str(user_id))
        for child in node.get("content", []):
            walk(child)

    walk(tiptap_json)
    return found
