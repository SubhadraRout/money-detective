const OLLAMA_URL = "http://localhost:11434/api/chat";
export async function chatWithOllama(messages) {
    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "qwen3:4b",
            messages,
            stream: false,
        }),
    });
    if (!response.ok) {
        throw new Error(`Ollama request failed (${response.status})`);
    }
    return (await response.json());
}
