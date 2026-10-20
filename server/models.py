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
    completed: bool = False
