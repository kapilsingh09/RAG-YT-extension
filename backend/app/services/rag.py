from operator import itemgetter
from langchain_community.vectorstores import FAISS
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.runnables import (
    RunnableParallel,
    RunnableLambda,
    RunnableWithMessageHistory,
)

# Chat storage
chat_store = {}

def get_session_history(session_id: str):
    """Fetches or creates the chat session history for a given session ID."""
    if session_id not in chat_store:
        chat_store[session_id] = InMemoryChatMessageHistory()
    return chat_store[session_id]


def format_docs(docs):
    """Formats retrieved document chunks into a single text block."""
    return "\n\n".join(doc.page_content for doc in docs)


SUMMARY_KEYWORDS = [
    "summarize", "summary", "tl;dr", "tldr", "overview",
    "what is this video about", "what's this video about",
    "explain the video", "gist", "brief", "short description",
    "main points", "key points", "what does this video cover",
    "video mein kya hai", "video ka summary", "summary do",
    "summary de", "bata kya hai", "kya bol raha hai video mein",
]

def classify_intent(query: str) -> str:
    """Classifies user intent as either 'summary' or 'qa' based on keyword matches."""
    query_lower = query.lower().strip()
    for keyword in SUMMARY_KEYWORDS:
        if keyword in query_lower:
            return "summary"
    return "qa"


# Caching layer
summary_cache: dict[str, str] = {}
vector_store_cache: dict[str, FAISS] = {}

SUMMARY_CHUNK_SIZE = 4000
DIRECT_SUMMARY_LIMIT = 6000

def generate_summary_stream(transcript: str, llm, video_id: str):
    """Streams summary generation and caches the complete result once generated."""
    token_estimate = len(transcript.split())
    full_response = ""

    if token_estimate < DIRECT_SUMMARY_LIMIT:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Summarize the following YouTube video transcript clearly and concisely, covering all key points."),
            ("human", "{transcript}"),
        ])
        chain = prompt | llm
        for chunk in chain.stream({"transcript": transcript}):
            if hasattr(chunk, "content") and chunk.content:
                full_response += chunk.content
                yield chunk.content
    else:
        words = transcript.split()
        text_chunks = [
            " ".join(words[i: i + SUMMARY_CHUNK_SIZE])
            for i in range(0, len(words), SUMMARY_CHUNK_SIZE)
        ]

        mini_prompt = ChatPromptTemplate.from_messages([
            ("system", "Summarize this section of a YouTube video transcript in 3-4 sentences. Be concise."),
            ("human", "{chunk}"),
        ])
        mini_chain = mini_prompt | llm

        mini_summaries = []
        for text_chunk in text_chunks:
            result = mini_chain.invoke({"chunk": text_chunk})
            mini_summaries.append(result.content)

        combined = "\n\n".join(mini_summaries)

        final_prompt = ChatPromptTemplate.from_messages([
            ("system", "Combine these section summaries into one coherent, well-structured summary of the full YouTube video."),
            ("human", "{combined}"),
        ])
        final_chain = final_prompt | llm
        for chunk in final_chain.stream({"combined": combined}):
            if hasattr(chunk, "content") and chunk.content:
                full_response += chunk.content
                yield chunk.content

    summary_cache[video_id] = full_response


def generate_rag_stream(question, memory_key, conversational_rag_chain):
    """Streams RAG chain response yielding content chunks progressively."""
    for chunk in conversational_rag_chain.stream(
        {"question": question},
        config={"configurable": {"session_id": memory_key}},
    ):
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content


def get_vector_store(transcript: str, embedding, video_id: str) -> FAISS:
    """
    Retrieves the FAISS vector store for a video transcript.
    Uses in-memory cache to prevent re-embedding the same transcript repeatedly.
    """
    if video_id in vector_store_cache:
        return vector_store_cache[video_id]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
    )
    chunks = splitter.create_documents([transcript])
    vector_store = FAISS.from_documents(
        documents=chunks,
        embedding=embedding,
    )
    vector_store_cache[video_id] = vector_store
    return vector_store


def setup_rag_chain(transcript: str, embedding, llm, video_id: str) -> RunnableWithMessageHistory:
    """Creates the complete conversational retrieval chain."""
    vector_store = get_vector_store(transcript, embedding, video_id)
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 3},
    )

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
You are a helpful YouTube video assistant.

Answer the user's question using the provided
YouTube transcript context and conversation history.

If the answer cannot be found in the transcript,
say that you don't know.

Use the conversation history to understand
references such as "it", "they", "that", etc.

Video Context:

{context}
""",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    parallel_chain = RunnableParallel({
        "context": itemgetter("question") | retriever | RunnableLambda(format_docs),
        "question": itemgetter("question"),
        "chat_history": itemgetter("chat_history"),
    })

    rag_chain = parallel_chain | prompt | llm

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )

    return conversational_rag_chain
