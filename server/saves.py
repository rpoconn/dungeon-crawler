"""Per-user save blob: GET returns it (or null), PUT upserts it."""

from typing import Annotated

from fastapi import APIRouter, Header
from pydantic import ValidationError

from auth import CurrentUser, Db
from models import SaveState

router = APIRouter(prefix="/save", tags=["save"])


@router.get("")
def get_save(user_id: CurrentUser, db: Db) -> SaveState | None:
    row = db.execute("SELECT state FROM saves WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        return None
    try:
        return SaveState.model_validate_json(row["state"])
    except ValidationError:
        # Stored before a rule tightened (e.g. a 0 hp run); start over rather than fail.
        return None


@router.put("")
def put_save(
    state: SaveState,
    user_id: CurrentUser,
    db: Db,
    writer: Annotated[str | None, Header(alias="X-Save-Writer", max_length=64)] = None,
    seq: Annotated[int | None, Header(alias="X-Save-Seq")] = None,
) -> SaveState:
    """Writes from one page load carry its `writer` id and a rising `seq`. A write that arrives
    after a newer one from the same writer (e.g. an autosave overtaken by the save sent as the
    tab closes) is dropped. Writes without both headers always land."""
    if writer is None or seq is None:
        writer, seq = None, None
    db.execute(
        """
        INSERT INTO saves (user_id, state, writer, seq) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE
            SET state = excluded.state, writer = excluded.writer, seq = excluded.seq,
                updated = CURRENT_TIMESTAMP
            WHERE excluded.writer IS NULL
               OR saves.writer IS NOT excluded.writer
               OR excluded.seq > saves.seq
        """,
        (user_id, state.model_dump_json(), writer, seq),
    )
    return state
