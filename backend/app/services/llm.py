from langchain_huggingface import (
    ChatHuggingFace,
    HuggingFaceEndpoint,
    HuggingFaceEmbeddings,
)
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from app.config.settings import settings

def get_model(model_name: str, api_key: str | None = None):
    """
    Initializes and returns the language model (LLM) and its associated embedding object.
    Supports free HuggingFace (Qwen), Gemini (Google), and Grok (xAI) providers.
    """
    embedding = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    if model_name == "free":
        if not settings.HF_API_KEY:
            raise ValueError("HF_API_KEY is not configured.")

        llm_endpoint = HuggingFaceEndpoint(
            repo_id="Qwen/Qwen2.5-7B-Instruct",
            task="text-generation",
            max_new_tokens=512,
            huggingfacehub_api_token=settings.HF_API_KEY,
        )
        llm = ChatHuggingFace(llm=llm_endpoint)
        return llm, embedding

    elif model_name == "gemini":
        if not api_key:
            raise ValueError("API Key is required for Gemini model.")
        print("API Key : ", api_key)
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.6-flash",
            google_api_key=api_key,
        )
        return llm, embedding

    elif model_name == "grok":
        if not api_key:
            raise ValueError("API Key is required for Grok model.")
        print("API Key : ", api_key)
        llm = ChatOpenAI(
            base_url="https://api.x.ai/v1",
            api_key=api_key,
            model="grok-4.5",
        )
        return llm, embedding

    else:
        raise ValueError(f"Unsupported model: {model_name}")
