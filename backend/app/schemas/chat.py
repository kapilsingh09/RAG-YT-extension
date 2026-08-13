from pydantic import BaseModel, Field

class YoutubeSchema(BaseModel):
    session_id: str = Field(
        ...,
        description="Unique ID for the current conversation",
    )

    question: str = Field(
        ...,
        description="Question about the YouTube video",
    )

    youtube_url: str = Field(
        ...,
        description="YouTube video URL",
    )

    model: str = Field(
        ...,
        description="LLM provider/model to use",
    )

    api_key: str | None = Field(
        default=None,
        description="API key for the selected model",
    )
