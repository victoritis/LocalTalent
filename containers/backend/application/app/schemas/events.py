from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


EVENT_TYPES = {'workshop', 'meetup', 'conference', 'collaboration', 'networking', 'other'}
RSVP_STATUSES = {'confirmed', 'declined', 'pending'}


class EventCreateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    event_type: str
    start_date: datetime
    end_date: Optional[datetime] = None
    is_online: bool = False
    meeting_url: Optional[str] = Field(default=None, max_length=500)
    address: Optional[str] = Field(default=None, max_length=300)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    max_attendees: Optional[int] = Field(default=None, ge=1, le=100000)
    is_public: bool = True
    category: Optional[str] = Field(default=None, max_length=50)
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator('event_type')
    @classmethod
    def check_event_type(cls, v: str) -> str:
        if v not in EVENT_TYPES:
            raise ValueError(f"event_type inválido. Debe ser uno de {sorted(EVENT_TYPES)}")
        return v

    @model_validator(mode='after')
    def check_dates(self):
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValueError("end_date no puede ser anterior a start_date")
        return self


class EventUpdateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    event_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_online: Optional[bool] = None
    meeting_url: Optional[str] = Field(default=None, max_length=500)
    address: Optional[str] = Field(default=None, max_length=300)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    max_attendees: Optional[int] = Field(default=None, ge=1, le=100000)
    is_public: Optional[bool] = None
    category: Optional[str] = Field(default=None, max_length=50)
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator('event_type')
    @classmethod
    def check_event_type(cls, v):
        if v is not None and v not in EVENT_TYPES:
            raise ValueError(f"event_type inválido. Debe ser uno de {sorted(EVENT_TYPES)}")
        return v


class RSVPSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    status: Literal['confirmed', 'declined', 'pending'] = 'confirmed'
    notes: Optional[str] = Field(default=None, max_length=1000)


class EventInvitationSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    invitee_id: int = Field(ge=1)
    message: Optional[str] = Field(default=None, max_length=1000)


class EventInvitationResponseSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    status: Literal['accepted', 'declined']
