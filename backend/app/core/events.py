from datetime import datetime, timezone
from typing import Any

def build_event(event_type: str, project_id: str, payload: Any, user_id: str) -> dict:
    return {
        "type": event_type,
        "project_id": project_id,
        "payload": payload,
        "triggered_by": str(user_id),
        # ISO 8601 with explicit UTC — this timestamp becomes important on
        # Day 5 for last-write-wins conflict resolution, so get it right now:
        # always UTC, always from the server, never trust a client-supplied time.
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }