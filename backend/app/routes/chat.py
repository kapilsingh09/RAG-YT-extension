from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from youtube_transcript_api import TranscriptsDisabled

from app.schemas.chat import YoutubeSchema
from app.services.youtube import extract_video_id, get_youtube_transcript
from app.services.llm import get_model
from app.services.rag import (
    classify_intent,
    summary_cache,
    generate_summary_stream,
    setup_rag_chain,
    generate_rag_stream,
)

router = APIRouter()

@router.post("/ask")
def ask_youtube_video(payload: YoutubeSchema):
    video_id = None
    try:
        youtube_url = payload.youtube_url
        video_id = extract_video_id(youtube_url)
        if not video_id:
            return {"error": "Invalid YouTube URL"}

        memory_key = f"{payload.session_id}:{video_id}"

        try:
            formatted_transcript = get_youtube_transcript(video_id)
        except TranscriptsDisabled as e:
            return {
                "error": "Transcripts are disabled for this video",
                "details": str(e),
                "video_id": video_id,
            }
        except Exception as e:
            return {
                "error": "Transcript is empty or failed to fetch",
                "details": str(e),
                "video_id": video_id,
            }

        llm, embedding = get_model(payload.model, payload.api_key)

        intent = classify_intent(payload.question)

        if intent == "summary":
            if video_id in summary_cache:
                return StreamingResponse(
                    iter([summary_cache[video_id]]),
                    media_type="text/plain",
                )

            return StreamingResponse(
                generate_summary_stream(formatted_transcript, llm, video_id),
                media_type="text/plain",
            )

        conversational_rag_chain = setup_rag_chain(
            formatted_transcript, embedding, llm, video_id
        )

        return StreamingResponse(
            generate_rag_stream(
                payload.question, memory_key, conversational_rag_chain
            ),
            media_type="text/plain",
        )

    except Exception as e:
        print("Error fetching transcript or running RAG:", e)
        return {
            "error": "Failed to process video",
            "details": str(e),
            "video_id": video_id,
            "url": payload.youtube_url,
        }
