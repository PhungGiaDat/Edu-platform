from typing import List, Dict, Any
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from settings import settings
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.llm = ChatGoogleGenerativeAI(model="gemini-pro", google_api_key=settings.GOOGLE_API_KEY)
        else:
            logger.warning("GOOGLE_API_KEY not set. AI features disabled.")
            self.llm = None

    async def chat(self, message: str, context: str = "") -> str:
        if not self.llm:
            return "AI service is not configured."
        
        prompt = PromptTemplate(
            input_variables=["context", "question"],
            template="You are a helpful AI tutor for children learning languages.\nContext: {context}\n\nKid: {question}\nTutor:"
        )
        chain = LLMChain(llm=self.llm, prompt=prompt)
        response = await chain.ainvoke({"context": context, "question": message})
        return response["text"]

    async def analyze_pronunciation(self, text: str, audio_transcription: str) -> Dict[str, Any]:
        """
        Analyze pronunciation by comparing target text with transcribed audio.
        Returns score and feedback.
        """
        if not self.llm:
            return {"score": 0, "feedback": "AI not configured"}

        prompt = PromptTemplate(
            input_variables=["target", "actual"],
            template="Compare the target sentence '{target}' with the spoken sentence '{actual}'. Rate the pronunciation accuracy from 0-100 and provide simple feedback for a child."
        )
        chain = LLMChain(llm=self.llm, prompt=prompt)
        response = await chain.ainvoke({"target": text, "actual": audio_transcription})
        return {"feedback": response["text"]}

def get_ai_service() -> AIService:
    return AIService()
