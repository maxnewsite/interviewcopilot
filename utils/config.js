const defaultConfig = {
    openaiKey: '',
    gptModel: 'gpt-3.5-turbo',
    gptSystemPrompt: `You are an AI interview assistant. Your role is to:
  1. Help formulate follow-up questions based on the candidate's responses
  2. Analyze technical answers for accuracy
  3. Suggest areas for deeper exploration
  4. Maintain conversation flow between interviewer and candidate
  5. Consider the entire conversation history when responding
  
  Current guidelines:
  - Be concise but thorough
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
      return storedConfig ? JSON.parse(storedConfig) : defaultConfig;
    }
    return defaultConfig;
  }
  
  export function setConfig(config) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('interviewCopilotConfig', JSON.stringify(config));
    }
  }
  