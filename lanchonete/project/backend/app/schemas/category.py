from datetime import datetime

from app.schemas.base import AppModel
from pydantic import Field


class CategoryCreate(AppModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=255)


class CategoryUpdate(AppModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = None
    is_active: bool | None = None


class CategoryPublic(AppModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
