import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


USERNAME_REGEX = re.compile(r'^[a-z0-9_-]{3,30}$')


class ProfileUpdateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=500)
    skills: Optional[list[str]] = None
    category: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=300)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


class UsernameUpdateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    username: str = Field(min_length=3, max_length=30)

    @field_validator('username')
    @classmethod
    def check_format(cls, v: str) -> str:
        v = v.lower()
        if not USERNAME_REGEX.match(v):
            raise ValueError(
                "username debe tener 3-30 caracteres con sólo minúsculas, dígitos, '_' y '-'"
            )
        return v
