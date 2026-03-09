const API_URL = "http://localhost:3000";

async function translateText(text: string): Promise<string> {
    try {
        const response = await fetch(`${API_URL}/translation?text=${encodeURIComponent(text)}`);
        if (!response.ok) {
            throw new Error(`Translation API error: ${response.statusText}`);
        }   
        const data = await response.json();
        return data.translatedText;
    } catch (error) {
        console.error("Error translating text:", error);
        return "Translation failed";
    }
}

export { translateText };