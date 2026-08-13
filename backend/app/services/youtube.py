from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled

# In-memory transcript cache: video_id -> formatted transcript string
transcript_cache: dict[str, str] = {}

def extract_video_id(youtube_url: str) -> str | None:
    """
    Extracts the video ID from a YouTube URL.
    Returns None if the URL does not contain 'v='.
    """
    if "v=" not in youtube_url:
        return None
    return youtube_url.split("v=")[1].split("&")[0]

def get_youtube_transcript(video_id: str) -> str:
    """
    Fetches the transcript for a video from YouTube Transcript API.
    Utilizes an in-memory cache to prevent redundant external API calls.
    Raises TranscriptsDisabled if transcripts are disabled.
    Raises ValueError if transcript is empty.
    """
    if video_id in transcript_cache:
        return transcript_cache[video_id]

    # Fetch from API
    try:
        transcript = YouTubeTranscriptApi().fetch(video_id)
    except TranscriptsDisabled as e:
        raise e

    formatted_transcript = " ".join(
        snippet["text"]
        if isinstance(snippet, dict)
        else getattr(snippet, "text", "")
        for snippet in transcript
    )

    if not formatted_transcript.strip():
        raise ValueError("Transcript is empty")

    # Save to cache
    transcript_cache[video_id] = formatted_transcript
    return formatted_transcript
