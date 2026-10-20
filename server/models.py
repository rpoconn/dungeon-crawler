"""Pydantic request/response models."""

from pydantic import BaseModel, Field


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    token: str
    username: str


class SaveState(BaseModel):
    level: int = Field(ge=1, le=10)
    seed: int
    hp: int = Field(ge=0)
    maxHp: int = Field(gt=0)
    weaponId: str
    x: int
    y: int
    # Spawn-plan indices on the current floor. Defaults keep pre-Phase-4 saves loadable.
    openedChests: list[int] = Field(default_factory=list, max_length=50)
    slain: list[int] = Field(default_factory=list, max_length=200)
    completed: bool = False
