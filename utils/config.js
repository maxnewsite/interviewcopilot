// utils/config.js
export const builtInModelGroups = [
  {
    name: "Anthropic Models",
    models: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Latest)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ]
  },
  {
    name: "OpenAI Models", 
    models: [
      { value: "gpt-4o", label: "GPT-4o (Latest)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ]
  },
  {
    name: "Gemini Models",
    models: [
      { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ]
  },
  {
    name: "Custom Models",
    models: [] // Will be populated from user's custom models
  }
];

const defaultConfig = {
  // API Keys
  anthropicKey: '',
  openaiKey: '',
  geminiKey: '',
  
  // Model Selection
  aiModel: 'claude-3-5-sonnet-20241022', // Default to Claude
  
  // Behavior Settings
  silenceTimerDuration: 1.5, // Slightly longer for coaching conversations
  responseLength: 'medium',
  
  // Question Generation Settings
  dialogueListenDuration: 30, // Seconds of dialogue before suggesting questions (default 30 seconds)
  numberOfQuestions: 2, // Number of questions to generate (1-3)
  autoSuggestQuestions: true, // Automatically suggest questions after dialogue duration
  
  // System Prompt for Coaching
  systemPrompt: `You are an AI executive coaching assistant. Your role is to:
- Support the coach by providing insights and suggestions during coaching sessions
- Help identify key themes and patterns in the coachee's responses
- Suggest powerful coaching questions to deepen exploration
- Highlight emotional cues and non-verbal communication patterns
- Provide frameworks and models relevant to the coaching topic
- Maintain strict confidentiality and professional boundaries
- Support the coach without taking over the coaching process`,
  
  // Azure Speech Settings
  azureToken: '',
  azureRegion: 'eastus',
  azureLanguage: 'en-US',
  
  // Custom Models & Preferences
  customModels: [],
  coacheeAutoMode: true, // Auto-submit coachee's speech
  isManualMode: false, // Manual mode for coach
};

export function getConfig() {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem('coachingAssistantConfig');
    let parsed = storedConfig ? JSON.parse(storedConfig) : {};
    
    // Migration from old config
    if (parsed.gptSystemPrompt && !parsed.systemPrompt) {
      parsed.systemPrompt = parsed.gptSystemPrompt;
      delete parsed.gptSystemPrompt;
    }
    if (parsed.systemAutoMode !== undefined && parsed.coacheeAutoMode === undefined) {
      parsed.coacheeAutoMode = parsed.systemAutoMode;
      delete parsed.systemAutoMode;
    }
    
    // Ensure customModels is an array
    if (!Array.isArray(parsed.customModels)) {
      parsed.customModels = [];
    }

    return { ...defaultConfig, ...parsed };
  }
  return defaultConfig;
}

export function setConfig(config) {
  if (typeof window !== 'undefined') {
    const configToSave = {
      ...config,
      customModels: Array.isArray(config.customModels) ? config.customModels : []
    };
    localStorage.setItem('coachingAssistantConfig', JSON.stringify(configToSave));
  }
}

// Helper function to determine API type from model name
export function getModelType(modelName) {
  if (modelName.startsWith('claude')) return 'anthropic';
  if (modelName.startsWith('gpt')) return 'openai';
  if (modelName.startsWith('gemini')) return 'gemini';
  
  // Check custom models
  const config = getConfig();
  const customModel = config.customModels.find(m => m.value === modelName);
  if (customModel) return customModel.type;
  
  return 'openai'; // default fallback
}
