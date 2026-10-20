"""Per-user save blob: GET returns it (or null), PUT upserts it."""

from fastapi import APIRouter

from auth import CurrentUser, Db
from models import SaveState

router = APIRouter(prefix="/save", tags=["save"])


@router.get("")
def get_save(user_id: CurrentUser, db: Db) -> SaveState | None:
    row = db.execute("SELECT state FROM saves WHERE user_id = ?", (user_id,)).fetchone()
    return None if row is None else SaveState.model_validate_json(row["state"])


@router.put("")
def put_save(state: SaveState, user_id: CurrentUser, db: Db) -> SaveState:
    db.execute(
        """
        INSERT INTO saves (user_id, state) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE
            SET state = excluded.state, updated = CURRENT_TIMESTAMP
        """,
        (user_id, state.model_dump_json()),
    )
    return state
