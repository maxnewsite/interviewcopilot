// pages/coaching.js (Key sections with question generation features)
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

// ... other imports ...

export default function CoachingPage() {
  const dispatch = useDispatch();
  const transcriptionFromStore = useSelector(state => state.transcription);
  const aiResponseFromStore = useSelector(state => state.aiResponse);
  const history = useSelector(state => state.history);
  const theme = useTheme();

  const [appConfig, setAppConfig] = useState(getConfig());
  
  // Question Generation States
  const [urgentQuestionsDialog, setUrgentQuestionsDialog] = useState(false);
  const [urgentQuestionsCount, setUrgentQuestionsCount] = useState(2);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [dialogueDuration, setDialogueDuration] = useState(0);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  
  // Refs for tracking dialogue
  const dialogueTimerRef = useRef(null);
  const lastQuestionTimeRef = useRef(Date.now());
  const dialogueBufferRef = useRef([]);
  
  // ... other states ...

  // Start dialogue timer when conversation begins
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

  // Track when dialogue is active based on transcription activity
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

    // Original transcription handling
    finalTranscript.current[source] += cleanText + ' ';
    
    if (source === 'coachee') {
      dispatch(setTranscription(finalTranscript.current.coachee + coacheeInterimTranscription.current));
    } else {
      setCoachTranscription(finalTranscript.current.coach + coachInterimTranscription.current);
    }

    // ... rest of original function ...
  };

  // Generate coaching questions
  const generateCoachingQuestions = async (numQuestions = null) => {
    const questionsToGenerate = numQuestions || appConfig.numberOfQuestions || 2;
    
    if (!aiClient || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }
    
    setGeneratingQuestions(true);
    
    // Gather recent dialogue context
    const recentDialogue = dialogueBufferRef.current
      .slice(-10) // Last 10 exchanges
      .map(item => `${item.source}: ${item.text}`)
      .join('\n');
    
    const prompt = `Based on the recent coaching dialogue below, generate exactly ${questionsToGenerate} powerful coaching question(s) that the coach could ask next. 
    
Focus on:
- Open-ended questions that encourage deeper exploration
- Questions that build on themes already discussed
- Questions that might reveal underlying beliefs or patterns
- Questions that move the conversation forward productively

Recent dialogue:
${recentDialogue || 'No recent dialogue captured yet.'}

Please provide exactly ${questionsToGenerate} question(s), numbered and separated by newlines. Only provide the questions, no additional explanation.`;

    try {
      // Use a simpler non-streaming approach for questions
      let questionsResponse = '';
      
      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: 150,
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
          max_tokens: 150
        });
        questionsResponse = response.choices[0].message.content;
        
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
        });
        const result = await model.generateContent(prompt);
        questionsResponse = result.response.text();
      }
      
      // Parse the questions
      const questions = questionsResponse
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(q => q.length > 0)
        .slice(0, questionsToGenerate);
      
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

  // Urgent Questions Dialog Component
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

  // Question Suggestions Card Component
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

  // Main render with question generation UI
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
            {/* Left Panel - Coachee Audio */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Coachee Audio Card - Same as before */}
              <Card>
                <CardHeader title="Coachee Audio" avatar={<RecordVoiceOverIcon />} sx={{ pb: 1 }} />
                {/* ... existing content ... */}
              </Card>
              
              {/* Question Suggestions Card */}
              <QuestionSuggestionsCard />
              
              {/* Session Topics Card */}
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title="Session Topics"
                  avatar={<PlaylistAddCheckIcon />}
                  // ... existing content ...
                />
              </Card>
            </Grid>

            {/* Center Panel - AI Coaching Insights */}
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* ... existing content ... */}
            </Grid>

            {/* Right Panel - Coach's Notes */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* ... existing content ... */}
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
    </>
  );
}
