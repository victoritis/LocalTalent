from pydantic import BaseModel, ConfigDict, Field


class MessageSendSchema(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=5000)
