const defaultConfig = {
  openaiKey: '',
  geminiKey: '',
  aiModel: 'gemini-2.0-flash',
  silenceTimerDuration: 1.2, // Default 1.2 seconds
  responseLength: 'medium',
  gptSystemPrompt: `You are an AI interview assistant. Your role is to:
- Highlight key points in responses
- Suggest related technical concepts to explore
- Maintain professional tone`,
  azureToken: '',
  azureRegion: 'eastus',
  azureLanguage: 'en-US',
};

export function getConfig() {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem('interviewCopilotConfig');
    const parsed = storedConfig ? JSON.parse(storedConfig) : {};
    // Migrate old config format
    if (parsed.gptModel && !parsed.aiModel) {
      parsed.aiModel = parsed.gptModel;
      delete parsed.gptModel;
    }
    return { ...defaultConfig, ...parsed };
  }
  return defaultConfig;
}

export function setConfig(config) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('interviewCopilotConfig', JSON.stringify(config));
  }
}