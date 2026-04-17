from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


PROJECT_STATUSES = {'draft', 'active', 'completed', 'cancelled'}
PROJECT_MEMBER_ROLES = {'owner', 'admin', 'member', 'contributor'}


class ProjectCreateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    status: Literal['draft', 'active', 'completed', 'cancelled'] = 'draft'
    required_skills: list[str] = Field(default_factory=list)
    max_members: Optional[int] = Field(default=None, ge=1, le=10000)
    is_public: bool = True
    category: Optional[str] = Field(default=None, max_length=50)
    image_url: Optional[str] = Field(default=None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    @model_validator(mode='after')
    def check_dates(self):
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValueError("end_date no puede ser anterior a start_date")
        return self


class ProjectUpdateSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    status: Optional[Literal['draft', 'active', 'completed', 'cancelled']] = None
    required_skills: Optional[list[str]] = None
    max_members: Optional[int] = Field(default=None, ge=1, le=10000)
    is_public: Optional[bool] = None
    category: Optional[str] = Field(default=None, max_length=50)
    image_url: Optional[str] = Field(default=None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectMemberSchema(BaseModel):
    """Body para `POST /projects/<id>/members`.

    - Si se pasa `user_id`, el caller (owner) invita a un usuario.
    - Si no, el propio usuario solicita unirse.
    """
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    user_id: Optional[int] = Field(default=None, ge=1)
    role: Optional[str] = Field(default=None, max_length=30)
    message: Optional[str] = Field(default=None, max_length=1000)


class ProjectMemberRoleSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    role: Literal['owner', 'collaborator', 'contributor']


class ProjectMemberResponseSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    action: Literal['accept', 'decline']
