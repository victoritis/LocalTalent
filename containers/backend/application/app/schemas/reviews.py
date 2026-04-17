from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ReviewCreateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    reviewee_id: int = Field(ge=1)
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default='', max_length=2000)


class ReviewUpdateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)
