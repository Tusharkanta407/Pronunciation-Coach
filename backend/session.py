import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from levels import LEVELS


@dataclass
class Session:
    id: str
    consent_given: bool = False
    mode_results: dict = field(default_factory=dict)
    practice_cleared: dict = field(default_factory=dict)  # mode -> set of words
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "consent_given": self.consent_given,
            "mode_results": self.mode_results,
            "practice_cleared": self.practice_cleared,
        }


class SessionStore:
    """In-memory session store. Audio is never persisted."""

    RETENTION_HOURS = 24

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self, *, consent: bool = False) -> Session:
        self._purge_expired()
        session = Session(id=str(uuid.uuid4()), consent_given=consent)
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Optional[Session]:
        self._purge_expired()
        session = self._sessions.get(session_id)
        if session:
            session.last_activity = datetime.now(timezone.utc)
        return session

    def delete(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def _purge_expired(self) -> None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=self.RETENTION_HOURS)
        expired = [sid for sid, s in self._sessions.items() if s.last_activity < cutoff]
        for sid in expired:
            del self._sessions[sid]


store = SessionStore()
