import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ChatResponse {
    response: string;
}

export interface PronunciationResult {
    feedback: string;
}

export const ChatService = {
    async sendMessage(message: string, context: string = ""): Promise<string> {
        const response = await axios.post(`${API_URL}/chat/message`, {
            message,
            context
        });
        return response.data.response;
    },

    async analyzePronunciation(targetText: string, audioText: string): Promise<PronunciationResult> {
        const response = await axios.post(`${API_URL}/chat/pronunciation`, {
            target_text: targetText,
            audio_text: audioText
        });
        return response.data;
    }
};
