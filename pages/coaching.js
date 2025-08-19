// pages/coaching.js - Complete Executive Coaching Assistant
import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';

// MUI Components
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';

// MUI Icons
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HearingIcon from '@mui/icons-material/Hearing';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonIcon from '@mui/icons-material/Person';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import PsychologyIcon from '@mui/icons-material/Psychology';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import TimerIcon from '@mui/icons-material/Timer';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

// Third-party Libraries
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import throttle from 'lodash.throttle';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import ScrollToBottom from 'react-scroll-to-bottom';

// Local Imports
import SettingsDialog from '../components/SettingsDialog';
import { setAIResponse } from '../redux/aiResponseSlice';
import { addToHistory } from '../redux/historySlice';
import { clearTranscription, setTranscription } from '../redux/transcriptionSlice';
import { getConfig, setConfig as saveConfig, getModelType } from '../utils/config';
import { generateQuestionPrompt, parseQuestions, analyzeDialogueForQuestionStyle } from '../utils/coachingPrompts';

// Utility function
function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

export default function CoachingPage() {
  const dispatch = useDispatch();
  const transcriptionFromStore = useSelector(state => state.transcription);
  const aiResponseFromStore = useSelector(state => state.aiResponse);
  const history = useSelector(state => state.history);
  const theme = useTheme();

  const [appConfig, setAppConfig] = useState(getConfig());

  // Audio Recognition States
  const [coachRecognizer, setCoachRecognizer] = useState(null);
  const [coacheeRecognizer, setCoacheeRecognizer] = useState(null);
  const [isCoachMicActive, setIsCoachMicActive] = useState(false);
  const [isCoacheeMicActive, setIsCoacheeMicActive] = useState(false);
  const [coachTranscription, setCoachTranscription] = useState('');
  const [coacheeAutoMode, setCoacheeAutoMode] = useState(appConfig.coacheeAutoMode !== undefined ? appConfig.coacheeAutoMode : true);
  const [isManualMode, setIsManualMode] = useState(appConfig.isManualMode !== undefined ? appConfig.isManualMode : false);

  // AI & Processing States
  const [aiClient, setAiClient] = useState(null);
  const [isAILoading, setIsAILoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [autoScroll, setAutoScroll] = useState(true);
  const [aiResponseSortOrder, setAiResponseSortOrder] = useState('newestAtBottom');
  const [isPipWindowActive, setIsPipWindowActive] = useState(false);

  // Question Generation States
  const [urgentQuestionsDialog, setUrgentQuestionsDialog] = useState(false);
  const [urgentQuestionsCount, setUrgentQuestionsCount] = useState(2);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [dialogueDuration, setDialogueDuration] = useState(0);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Session Management States
  const [sessionTopics, setSessionTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState('');

  // Refs
  const pipWindowRef = useRef(null);
  const documentPipWindowRef = useRef(null);
  const documentPipIframeRef = useRef(null);
  const coachInterimTranscription = useRef('');
  const coacheeInterimTranscription = useRef('');
  const silenceTimer = useRef(null);
  const finalTranscript = useRef({ coach: '', coachee: '' });
  const isManualModeRef = useRef(isManualMode);
  const coacheeAutoModeRef = useRef(coacheeAutoMode);
  const throttledDispatchSetAIResponseRef = useRef(null);
  const dialogueTimerRef = useRef(null);
  const lastQuestionTimeRef = useRef(Date.now());
  const dialogueBufferRef = useRef([]);

  // Utility Functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Settings Management
  const handleSettingsSaved = () => {
    const newConfig = getConfig();
    setAppConfig(newConfig);
    setIsAILoading(true);
    setCoacheeAutoMode(newConfig.coacheeAutoMode !== undefined ? newConfig.coacheeAutoMode : true);
    setIsManualMode(newConfig.isManualMode !== undefined ? newConfig.isManualMode : false);
    showSnackbar('Settings saved successfully', 'success');
  };

  // AI Client Initialization
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const modelType = getModelType(appConfig.aiModel);
        
        if (modelType === 'anthropic') {
          if (!appConfig.anthropicKey) {
            showSnackbar('Anthropic API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({
            apiKey: appConfig.anthropicKey,
            dangerouslyAllowBrowser: true
          });
          setAiClient({ client, type: 'anthropic' });
        } else if (modelType === 'gemini') {
          if (!appConfig.geminiKey) {
            showSnackbar('Gemini API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const genAI = new GoogleGenerativeAI(appConfig.geminiKey);
          setAiClient({ client: genAI, type: 'gemini' });
        } else {
          if (!appConfig.openaiKey) {
            showSnackbar('OpenAI API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const openaiClient = new OpenAI({
            apiKey: appConfig.openaiKey,
            dangerouslyAllowBrowser: true
          });
          setAiClient({ client: openaiClient, type: 'openai' });
        }
      } catch (error) {
        console.error('Error initializing AI client:', error);
        showSnackbar('Error initializing AI client: ' + error.message, 'error');
        setAiClient(null);
      } finally {
        setIsAILoading(false);
      }
    };

    if (isAILoading) initializeAI();
  }, [appConfig, isAILoading, showSnackbar]);

  // Throttled AI Response Dispatch
  useEffect(() => {
    throttledDispatchSetAIResponseRef.current = throttle((payload) => {
      dispatch(setAIResponse(payload));
    }, 250, { leading: true, trailing: true });

    return () => {
      if (throttledDispatchSetAIResponseRef.current?.cancel) {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
    };
  }, [dispatch]);

  // Dialogue Timer Management
  useEffect(() => {
    if (isDialogueActive) {
      dialogueTimerRef.current = setInterval(() => {
        setDialogueDuration(prev => {
          const newDuration = prev + 1;
          
          // Check if we should auto-generate questions
          if (appConfig.autoSuggestQuestions && 
              newDuration >= appConfig.dialogueListenDuration &&
              newDuration % appConfig.dialogueListenDuration === 0) {
            generateCoachingQuestions(appConfig.numberOfQuestions);
          }
          
          return newDuration;
        });
      }, 1000);
    } else {
      if (dialogueTimerRef.current) {
        clearInterval(dialogueTimerRef.current);
      }
    }
    
    return () => {
      if (dialogueTimerRef.current) {
        clearInterval(dialogueTimerRef.current);
      }
    };
  }, [isDialogueActive, appConfig]);

  // Update refs when states change
  useEffect(() => { isManualModeRef.current = isManualMode; }, [isManualMode]);
  useEffect(() => { coacheeAutoModeRef.current = coacheeAutoMode; }, [coacheeAutoMode]);

  // Speech Recognition Functions
  const createRecognizer = async (mediaStream, source) => {
    if (!appConfig.azureToken || !appConfig.azureRegion) {
      showSnackbar('Azure Speech credentials missing. Please set them in Settings.', 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    let audioConfig;
    try {
      audioConfig = SpeechSDK.AudioConfig.fromStreamInput(mediaStream);
    } catch (configError) {
      console.error(`Error creating AudioConfig for ${source}:`, configError);
      showSnackbar(`Error setting up audio for ${source}: ${configError.message}`, 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(appConfig.azureToken, appConfig.azureRegion);
    speechConfig.speechRecognitionLanguage = appConfig.azureLanguage;

    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
        const interimText = e.result.text;
        if (source === 'coachee') {
          coacheeInterimTranscription.current = interimText;
          dispatch(setTranscription(finalTranscript.current.coachee + interimText));
        } else {
          coachInterimTranscription.current = interimText;
          setCoachTranscription(finalTranscript.current.coach + interimText);
        }
      }
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        if (source === 'coachee') coacheeInterimTranscription.current = '';
        else coachInterimTranscription.current = '';
        handleTranscriptionEvent(e.result.text, source);
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason} for ${source}`);
      if (e.reason === SpeechSDK.CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
        showSnackbar(`Speech recognition error for ${source}: ${e.errorDetails}`, 'error');
      }
      stopRecording(source);
    };

    recognizer.sessionStopped = (s, e) => {
      console.log(`Session stopped event for ${source}.`);
      stopRecording(source);
    };

    try {
      await recognizer.startContinuousRecognitionAsync();
      return recognizer;
    } catch (error) {
      console.error(`Error starting ${source} continuous recognition:`, error);
      showSnackbar(`Failed to start ${source} recognition: ${error.message}`, 'error');
      if (audioConfig?.close) audioConfig.close();
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }
  };

  const stopRecording = async (source) => {
    const recognizer = source === 'coach' ? coachRecognizer : coacheeRecognizer;
    if (recognizer?.stopContinuousRecognitionAsync) {
      try {
        await recognizer.stopContinuousRecognitionAsync();
        if (recognizer.audioConfig?.privSource?.privStream) {
          const stream = recognizer.audioConfig.privSource.privStream;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        if (recognizer.audioConfig?.close) {
          recognizer.audioConfig.close();
        }
      } catch (error) {
        console.error(`Error stopping ${source} recognition:`, error);
        showSnackbar(`Error stopping ${source} audio: ${error.message}`, 'error');
      } finally {
        if (source === 'coach') {
          setIsCoachMicActive(false);
          setCoachRecognizer(null);
        } else {
          setIsCoacheeMicActive(false);
          setCoacheeRecognizer(null);
        }
      }
    }
  };

  const startMicrophoneRecognition = async (source) => {
    const isActive = source === 'coach' ? isCoachMicActive : isCoacheeMicActive;
    
    if (isActive) {
      await stopRecording(source);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const currentRecognizer = source === 'coach' ? coachRecognizer : coacheeRecognizer;
      
      if (currentRecognizer) await stopRecording(source);

      const recognizerInstance = await createRecognizer(mediaStream, source);
      if (recognizerInstance) {
        if (source === 'coach') {
          setCoachRecognizer(recognizerInstance);
          setIsCoachMicActive(true);
        } else {
          setCoacheeRecognizer(recognizerInstance);
          setIsCoacheeMicActive(true);
        }
        showSnackbar(`${source === 'coach' ? 'Coach' : 'Coachee'} microphone recording started.`, 'success');
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Microphone capture error:', error);
      if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
        showSnackbar('Permission denied for microphone. Please allow access.', 'error');
      } else {
        showSnackbar(`Failed to access microphone: ${error.message || 'Unknown error'}`, 'error');
      }
      if (source === 'coach') {
        setIsCoachMicActive(false);
      } else {
        setIsCoacheeMicActive(false);
      }
    }
  };

  // Transcription Event Handler
  const handleTranscriptionEvent = (text, source) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    // Start dialogue tracking if not already active
    if (!isDialogueActive) {
      setIsDialogueActive(true);
    }
    
    // Reset the last activity time
    lastQuestionTimeRef.current = Date.now();
    
    // Add to dialogue buffer for context
    dialogueBufferRef.current.push({
      text: cleanText,
      source: source,
      timestamp: Date.now()
    });
    
    // Keep only recent dialogue (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    dialogueBufferRef.current = dialogueBufferRef.current.filter(
      item => item.timestamp > fiveMinutesAgo
    );

    // Update transcription
    finalTranscript.current[source] += cleanText + ' ';
    
    if (source === 'coachee') {
      dispatch(setTranscription(finalTranscript.current.coachee + coacheeInterimTranscription.current));
    } else {
      setCoachTranscription(finalTranscript.current.coach + coachInterimTranscription.current);
    }

    // Handle auto-submission with silence timer
    if ((source === 'coachee' && coacheeAutoModeRef.current) || (source === 'coach' && !isManualModeRef.current)) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        askAI(finalTranscript.current[source].trim(), source);
      }, appConfig.silenceTimerDuration * 1000);
    }
  };

  // Manual Input Handlers
  const handleManualInputChange = (value, source) => {
    if (source === 'coachee') {
      dispatch(setTranscription(value));
      finalTranscript.current.coachee = value;
    } else {
      setCoachTranscription(value);
      finalTranscript.current.coach = value;
    }
  };

  const handleManualSubmit = (source) => {
    const textToSubmit = source === 'coachee' ? transcriptionFromStore : coachTranscription;
    if (textToSubmit.trim()) {
      askAI(textToSubmit.trim(), source);
    } else {
      showSnackbar('Input is empty.', 'warning');
    }
  };

  const handleKeyPress = (e, source) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit(source);
    }
  };

  // Clear Functions
  const handleClearTranscription = (source) => {
    if (source === 'coachee') {
      finalTranscript.current.coachee = '';
      coacheeInterimTranscription.current = '';
      dispatch(clearTranscription());
    } else {
      finalTranscript.current.coach = '';
      coachInterimTranscription.current = '';
      setCoachTranscription('');
    }
  };

  // AI Processing
  const askAI = async (text, source) => {
    if (!text.trim()) {
      showSnackbar('No input text to process.', 'warning');
      return;
    }
    if (!aiClient || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }

    const lengthSettings = {
      concise: { temperature: 0.4, maxTokens: 250 },
      medium: { temperature: 0.6, maxTokens: 500 },
      lengthy: { temperature: 0.8, maxTokens: 1000 }
    };
    const { temperature, maxTokens } = lengthSettings[appConfig.responseLength || 'medium'];

    setIsProcessing(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let streamedResponse = '';

    dispatch(addToHistory({ type: 'question', text, timestamp, source, status: 'pending' }));
    dispatch(setAIResponse(''));

    try {
      const conversationHistoryForAPI = history
        .filter(e => e.text && (e.type === 'question' || e.type === 'response') && e.status !== 'pending')
        .slice(-6)
        .map(event => ({
          role: event.type === 'question' ? 'user' : 'assistant',
          content: event.text,
        }));

      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: maxTokens,
          temperature,
          system: appConfig.systemPrompt,
          messages: [
            ...conversationHistoryForAPI,
            { role: 'user', content: text }
          ],
          stream: true
        });

        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta') {
            const chunkText = chunk.delta.text || '';
            streamedResponse += chunkText;
            if (throttledDispatchSetAIResponseRef.current) {
              throttledDispatchSetAIResponseRef.current(streamedResponse);
            }
          }
        }
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
          systemInstruction: { parts: [{ text: appConfig.systemPrompt }] }
        });
        const chat = model.startChat({
          history: conversationHistoryForAPI.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
        });
        const result = await chat.sendMessageStream(text);
        for await (const chunk of result.stream) {
          if (chunk?.text) {
            const chunkText = chunk.text();
            streamedResponse += chunkText;
            if (throttledDispatchSetAIResponseRef.current) {
              throttledDispatchSetAIResponseRef.current(streamedResponse);
            }
          }
        }
      } else {
        const messages = [
          { role: 'system', content: appConfig.systemPrompt },
          ...conversationHistoryForAPI,
          { role: 'user', content: text }
        ];
        const stream = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });
        for await (const chunk of stream) {
          const chunkText = chunk.choices[0]?.delta?.content || '';
          streamedResponse += chunkText;
          if (throttledDispatchSetAIResponseRef.current) {
            throttledDispatchSetAIResponseRef.current(streamedResponse);
          }
        }
      }

      if (throttledDispatchSetAIResponseRef.current?.cancel) {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
      dispatch(setAIResponse(streamedResponse));

      const finalTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dispatch(addToHistory({ type: 'response', text: streamedResponse, timestamp: finalTimestamp, status: 'completed' }));

    } catch (error) {
      console.error("AI request error:", error);
      const errorMessage = `AI request failed: ${error.message || 'Unknown error'}`;
      showSnackbar(errorMessage, 'error');
      dispatch(setAIResponse(`Error: ${errorMessage}`));
      dispatch(addToHistory({ type: 'response', text: `Error: ${errorMessage}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'error' }));
    } finally {
      if ((source === 'coachee' && coacheeAutoModeRef.current) || (source === 'coach' && !isManualModeRef.current)) {
        finalTranscript.current[source] = '';
        if (source === 'coachee') {
          coacheeInterimTranscription.current = '';
          dispatch(setTranscription(''));
        } else {
          coachInterimTranscription.current = '';
          setCoachTranscription('');
        }
      }
      setIsProcessing(false);
    }
  };

  // Question Generation
  const generateCoachingQuestions = async (numQuestions = null) => {
    const questionsToGenerate = numQuestions || appConfig.numberOfQuestions || 2;
    
    if (!aiClient || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }
    
    setGeneratingQuestions(true);
    
    // Gather recent dialogue context
    const recentDialogue = dialogueBufferRef.current
      .slice(-10)
      .map(item => `${item.source}: ${item.text}`)
      .join('\n');
    
    const questionStyle = analyzeDialogueForQuestionStyle(dialogueBufferRef.current);
    const prompt = generateQuestionPrompt(recentDialogue, questionsToGenerate, questionStyle);

    try {
      let questionsResponse = '';
      
      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: 200,
          temperature: 0.7,
          system: "You are an expert executive coach. Generate powerful, open-ended coaching questions.",
          messages: [{ role: 'user', content: prompt }]
        });
        questionsResponse = response.content[0].text;
        
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: "You are an expert executive coach. Generate powerful, open-ended coaching questions." },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        });
        questionsResponse = response.choices[0].message.content;
        
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        });
        const result = await model.generateContent(prompt);
        questionsResponse = result.response.text();
      }
      
      // Parse the questions
      const questions = parseQuestions(questionsResponse, questionsToGenerate);
      
      setSuggestedQuestions(questions);
      
      // Add to history
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dispatch(addToHistory({ 
        type: 'questions', 
        text: `Suggested Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
        timestamp,
        status: 'completed'
      }));
      
      showSnackbar(`Generated ${questions.length} coaching question(s)`, 'success');
      
    } catch (error) {
      console.error('Error generating questions:', error);
      showSnackbar('Failed to generate questions: ' + error.message, 'error');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Question History Management
  const handleCombineAndSubmit = () => {
    if (selectedQuestions.length === 0) {
      showSnackbar('No questions selected to combine.', 'warning');
      return;
    }
    const questionHistory = history.filter(e => e.type === 'question').slice().reverse();
    const questionTexts = selectedQuestions.map(selectedIndexInReversedArray => {
      return questionHistory[selectedIndexInReversedArray]?.text;
    }).filter(text => text);

    if (questionTexts.length === 0) {
      showSnackbar('Could not retrieve selected question texts.', 'warning');
      return;
    }

    const combinedText = questionTexts.join('\n\n---\n\n');
    askAI(combinedText, 'combined');
    setSelectedQuestions([]);
  };

  // Session Topic Management
  const addSessionTopic = () => {
    if (currentTopic.trim() && !sessionTopics.includes(currentTopic.trim())) {
      setSessionTopics([...sessionTopics, currentTopic.trim()]);
      setCurrentTopic('');
    }
  };

  const removeSessionTopic = (topicToRemove) => {
    setSessionTopics(sessionTopics.filter(topic => topic !== topicToRemove));
  };

  // Response Formatting
  const formatAndDisplayResponse = useCallback((response) => {
    if (!response) return null;
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <Box sx={{
                my: 1,
                position: 'relative',
                '& pre': {
                  borderRadius: '4px',
                  padding: '12px !important',
                  fontSize: '0.875rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }
              }}>
                <pre><code className={className} {...props} dangerouslySetInnerHTML={{ __html: hljs.highlight(String(children).replace(/\n$/, ''), { language: match[1], ignoreIllegals: true }).value }} /></pre>
              </Box>
            ) : (
              <code
                className={className}
                {...props}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all'
                }}
              >
                {children}
              </code>
            );
          },
          p: ({ node, ...props }) => <Typography paragraph {...props} sx={{ mb: 1, fontSize: '0.95rem', wordBreak: 'break-word' }} />,
          strong: ({ node, ...props }) => <Typography component="strong" fontWeight="bold" {...props} />,
          em: ({ node, ...props }) => <Typography component="em" fontStyle="italic" {...props} />,
          ul: ({ node, ...props }) => <Typography component="ul" sx={{ pl: 2.5, mb: 1, fontSize: '0.95rem', wordBreak: 'break-word' }} {...props} />,
          ol: ({ node, ...props }) => <Typography component="ol" sx={{ pl: 2.5, mb: 1, fontSize: '0.95rem', wordBreak: 'break-word' }} {...props} />,
          li: ({ node, ...props }) => <Typography component="li" sx={{ mb: 0.25, fontSize: '0.95rem', wordBreak: 'break-word' }} {...props} />,
        }}
      >
        {response}
      </ReactMarkdown>
    );
  }, []);

  // History Rendering
  const renderHistoryItem = (item, index) => {
    if (item.type !== 'response') return null;
    const Icon = SmartToyIcon;
    const title = 'Coaching AI';
    const avatarBgColor = theme.palette.secondary.light;

    return (
      <ListItem key={`response-${index}`} sx={{ alignItems: 'flex-start', px: 0, py: 1.5 }}>
        <Avatar sx={{ bgcolor: avatarBgColor, mr: 2, mt: 0.5 }}>
          <Icon sx={{ color: theme.palette.getContrastText(avatarBgColor) }} />
        </Avatar>
        <Paper variant="outlined" sx={{ p: 1.5, flexGrow: 1, bgcolor: theme.palette.background.default, borderColor: theme.palette.divider, overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
            <Typography variant="caption" color="text.secondary">{item.timestamp}</Typography>
          </Box>
          {formatAndDisplayResponse(item.text)}
        </Paper>
      </ListItem>
    );
  };

  const renderQuestionHistoryItem = (item, index) => {
    const Icon = item.source === 'coach' ? PersonIcon : RecordVoiceOverIcon;
    const title = item.source === 'coach' ? 'Coach' : 'Coachee';
    const avatarBgColor = item.source === 'coach' ? theme.palette.primary.light : theme.palette.success.light;

    return (
      <ListItem
        key={`question-hist-${index}`}
        secondaryAction={
          <Checkbox
            edge="end"
            checked={selectedQuestions.includes(index)}
            onChange={() => {
              setSelectedQuestions(prev =>
                prev.includes(index) ? prev.filter(x => x !== index) : [...prev, index]
              );
            }}
            color="secondary"
            size="small"
          />
        }
        disablePadding
        sx={{ py: 0.5, display: 'flex', alignItems: 'center' }}
      >
        <Avatar sx={{ bgcolor: avatarBgColor, mr: 1.5, width: 32, height: 32, fontSize: '1rem' }}>
          <Icon fontSize="small" />
        </Avatar>
        <ListItemText
          primary={
            <Typography variant="body2" noWrap sx={{ fontWeight: selectedQuestions.includes(index) ? 'bold' : 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.text}
            </Typography>
          }
          secondary={`${title} - ${item.timestamp}`}
        />
      </ListItem>
    );
  };

  // Sort Order Management
  const handleSortOrderToggle = () => {
    setAiResponseSortOrder(prev => prev === 'newestAtBottom' ? 'newestAtTop' : 'newestAtBottom');
  };

  const getAiResponsesToDisplay = () => {
    let responses = history.filter(item => item.type === 'response').slice();
    const currentStreamingText = aiResponseFromStore;

    if (isProcessing && currentStreamingText && currentStreamingText.trim() !== '') {
      responses.push({ text: currentStreamingText, timestamp: 'Streaming...', type: 'current_streaming' });
    }

    if (aiResponseSortOrder === 'newestAtTop') {
      return responses.reverse();
    }
    return responses;
  };

  // PiP Window Management (simplified for coaching)
  const togglePipWindow = () => {
    showSnackbar('PiP feature coming soon for coaching sessions', 'info');
  };

  // Component Definitions
  const UrgentQuestionsDialog = () => (
    <Dialog open={urgentQuestionsDialog} onClose={() => setUrgentQuestionsDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveHelpIcon color="primary" />
          Generate Coaching Questions
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Generate powerful coaching questions based on the current conversation context.
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel>Number of Questions</InputLabel>
          <Select
            value={urgentQuestionsCount}
            onChange={(e) => setUrgentQuestionsCount(e.target.value)}
            label="Number of Questions"
          >
            <MenuItem value={1}>1 Question - Single focused inquiry</MenuItem>
            <MenuItem value={2}>2 Questions - Balanced exploration</MenuItem>
            <MenuItem value={3}>3 Questions - Multiple perspectives</MenuItem>
          </Select>
        </FormControl>
        
        {dialogueBufferRef.current.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No recent dialogue captured. Questions will be generated based on general coaching principles.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setUrgentQuestionsDialog(false)}>Cancel</Button>
        <Button 
          onClick={() => {
            generateCoachingQuestions(urgentQuestionsCount);
            setUrgentQuestionsDialog(false);
          }}
          variant="contained"
          color="primary"
          disabled={generatingQuestions}
          startIcon={generatingQuestions ? <CircularProgress size={16} /> : <PsychologyIcon />}
        >
          Generate Questions
        </Button>
      </DialogActions>
    </Dialog>
  );

  const QuestionSuggestionsCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Suggested Questions"
        avatar={<QuestionAnswerIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {appConfig.autoSuggestQuestions && dialogueDuration > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Next in {Math.max(0, appConfig.dialogueListenDuration - (dialogueDuration % appConfig.dialogueListenDuration))}s
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(dialogueDuration % appConfig.dialogueListenDuration) / appConfig.dialogueListenDuration * 100}
                  sx={{ width: 60, height: 4 }}
                />
              </Box>
            )}
            <Tooltip title="Generate Questions Now">
              <IconButton 
                onClick={() => setUrgentQuestionsDialog(true)}
                color="primary"
                disabled={generatingQuestions}
              >
                {generatingQuestions ? <CircularProgress size={20} /> : <LiveHelpIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent>
        {suggestedQuestions.length > 0 ? (
          <List dense>
            {suggestedQuestions.map((question, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`Q${index + 1}`} size="small" color="primary" />
                      <Typography variant="body2">{question}</Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {generatingQuestions ? 'Generating questions...' : 'No questions generated yet. Click the button above or wait for auto-generation.'}
          </Typography>
        )}
        
        {suggestedQuestions.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
              disabled={generatingQuestions}
            >
              Refresh Questions
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => setSuggestedQuestions([])}
            >
              Clear
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Main Render
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - Active Session</title>
      </Head>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <SmartToyIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              Executive Coaching Assistant
            </Typography>
            
            {/* Dialogue Duration Indicator */}
            {isDialogueActive && (
              <Chip
                icon={<TimerIcon />}
                label={`Session: ${Math.floor(dialogueDuration / 60)}:${(dialogueDuration % 60).toString().padStart(2, '0')}`}
                color="primary"
                variant="outlined"
                sx={{ mr: 2 }}
              />
            )}
            
            <Tooltip title="Settings">
              <IconButton color="primary" onClick={() => setSettingsOpen(true)} aria-label="settings">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 2, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            {/* Left Panel - Coachee */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card>
                <CardHeader title="Coachee Audio" avatar={<RecordVoiceOverIcon />} sx={{ pb: 1 }} />
                <CardContent>
                  <FormControlLabel
                    control={<Switch checked={coacheeAutoMode} onChange={e => setCoacheeAutoMode(e.target.checked)} color="primary" />}
                    label="Auto-Submit Speech"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={transcriptionFromStore}
                    onChange={(e) => handleManualInputChange(e.target.value, 'coachee')}
                    onKeyDown={(e) => handleKeyPress(e, 'coachee')}
                    placeholder="Coachee's speech..."
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      onClick={() => startMicrophoneRecognition('coachee')}
                      variant="contained"
                      color={isCoacheeMicActive ? 'error' : 'primary'}
                      startIcon={isCoacheeMicActive ? <MicOffIcon /> : <MicIcon />}
                      sx={{ flexGrow: 1 }}
                    >
                      {isCoacheeMicActive ? 'Stop Mic' : 'Start Mic'}
                    </Button>
                    <Tooltip title="Clear Coachee Transcription">
                      <IconButton onClick={() => handleClearTranscription('coachee')}><DeleteSweepIcon /></IconButton>
                    </Tooltip>
                    {!coacheeAutoMode && (
                      <Button
                        onClick={() => handleManualSubmit('coachee')}
                        variant="outlined"
                        color="primary"
                        startIcon={<SendIcon />}
                        disabled={isProcessing || !transcriptionFromStore.trim()}
                      >
                        Submit
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
              
              {/* Question Suggestions Card */}
              <QuestionSuggestionsCard />
              
              {/* Session Topics Card */}
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title="Session Topics"
                  avatar={<PlaylistAddCheckIcon />}
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Add a topic..."
                      value={currentTopic}
                      onChange={(e) => setCurrentTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSessionTopic()}
                    />
                    <Button 
                      variant="outlined" 
                      onClick={addSessionTopic}
                      disabled={!currentTopic.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {sessionTopics.map((topic, index) => (
                      <Chip
                        key={index}
                        label={topic}
                        onDelete={() => removeSessionTopic(topic)}
                        color="secondary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Center Panel - AI Coaching Insights */}
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title="AI Coaching Insights"
                  avatar={<SmartToyIcon />}
                  action={
                    <>
                      <Tooltip title={aiResponseSortOrder === 'newestAtTop' ? "Sort: Newest at Bottom" : "Sort: Newest on Top"}>
                        <IconButton onClick={handleSortOrderToggle} size="small">
                          {aiResponseSortOrder === 'newestAtTop' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
                        </IconButton>
                      </Tooltip>
                      <FormControlLabel
                        control={<Switch checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} color="primary" />}
                        label="Auto Scroll"
                        sx={{ ml: 1 }}
                      />
                    </>
                  }
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                  <ScrollToBottom
                    className="scroll-to-bottom"
                    mode={autoScroll ? (aiResponseSortOrder === 'newestAtTop' ? "top" : "bottom") : undefined}
                    followButtonClassName="hidden-follow-button"
                  >
                    <List sx={{ px: 2, py: 1 }}>
                      {getAiResponsesToDisplay().map(renderHistoryItem)}
                      {isProcessing && (
                        <ListItem sx={{ justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                          <Typography variant="caption" sx={{ ml: 1 }}>AI is analyzing...</Typography>
                        </ListItem>
                      )}
                    </List>
                  </ScrollToBottom>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Panel - Coach's Notes */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Card>
                <CardHeader title="Coach Audio" avatar={<PersonIcon />} sx={{ pb: 1 }} />
                <CardContent>
                  <FormControlLabel
                    control={<Switch checked={isManualMode} onChange={e => setIsManualMode(e.target.checked)} color="primary" />}
                    label="Manual Input Mode"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={coachTranscription}
                    onChange={(e) => handleManualInputChange(e.target.value, 'coach')}
                    onKeyDown={(e) => handleKeyPress(e, 'coach')}
                    placeholder="Coach's notes or speech..."
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      onClick={() => startMicrophoneRecognition('coach')}
                      variant="contained"
                      color={isCoachMicActive ? 'error' : 'primary'}
                      startIcon={isCoachMicActive ? <MicOffIcon /> : <MicIcon />}
                      sx={{ flexGrow: 1 }}
                    >
                      {isCoachMicActive ? 'Stop Mic' : 'Start Mic'}
                    </Button>
                    <Tooltip title="Clear Coach Transcription">
                      <IconButton onClick={() => handleClearTranscription('coach')}><DeleteSweepIcon /></IconButton>
                    </Tooltip>
                    {isManualMode && (
                      <Button
                        onClick={() => handleManualSubmit('coach')}
                        variant="outlined"
                        color="primary"
                        startIcon={<SendIcon />}
                        disabled={isProcessing || !coachTranscription.trim()}
                      >
                        Submit
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
              
              {/* Question History */}
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mt: 2 }}>
                <CardHeader
                  title="Question History"
                  avatar={<PlaylistAddCheckIcon />}
                  action={
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleCombineAndSubmit}
                      disabled={selectedQuestions.length === 0 || isProcessing}
                      startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    >
                      Ask Combined
                    </Button>
                  }
                  sx={{ pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                  <ScrollToBottom className="scroll-to-bottom" followButtonClassName="hidden-follow-button">
                    <List dense sx={{ pt: 0, px: 1 }}>
                      {history.filter(e => e.type === 'question').slice().reverse().map(renderQuestionHistoryItem)}
                    </List>
                  </ScrollToBottom>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Floating Action Button for Quick Question Generation */}
        <Fab
          color="primary"
          aria-label="generate questions"
          onClick={() => setUrgentQuestionsDialog(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'flex', md: 'none' } // Only show on mobile
          }}
        >
          <LiveHelpIcon />
        </Fab>

        {/* Dialogs */}
        <UrgentQuestionsDialog />
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSettingsSaved}
        />
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
      
      {/* Global Styles */}
      <style jsx global>{`
        .scroll-to-bottom {
          height: 100%;
          width: 100%;
          overflow-y: auto;
        }
        .hidden-follow-button {
          display: none;
        }
        .scroll-to-bottom::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scroll-to-bottom::-webkit-scrollbar-track {
          background: ${theme.palette.background.paper};
          border-radius: 10px;
        }
        .scroll-to-bottom::-webkit-scrollbar-thumb {
          background-color: ${theme.palette.grey[400]};
          border-radius: 10px;
          border: 2px solid ${theme.palette.background.paper};
        }
        .scroll-to-bottom::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.palette.grey[500]};
        }
        .scroll-to-bottom {
          scrollbar-width: thin;
          scrollbar-color: ${theme.palette.grey[400]} ${theme.palette.background.paper};
        }
      `}</style>
    </>
  );
}
