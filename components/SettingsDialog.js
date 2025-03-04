import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  ListSubheader
} from '@mui/material';
import { getConfig, setConfig } from '../utils/config';

export default function SettingsDialog({ open, onClose ,onSave}) {
  const [settings, setSettings] = useState(getConfig());

  useEffect(() => {
    setSettings(getConfig());
  }, [open]);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Validate model-key pairing
    if (settings.aiModel.startsWith('gemini') && !settings.geminiKey) {
      alert('Gemini model selected but no Gemini API key provided');
      return;
    }
    if (settings.aiModel.startsWith('gpt') && !settings.openaiKey) {
      alert('OpenAI model selected but no OpenAI API key provided');
      return;
    }
  
    setConfig(settings);
    onClose();
    if (onSave) onSave();
  };


  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="normal"
          name="openaiKey"
          label="OpenAI API Key"
          value={settings.openaiKey}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="geminiKey"
          label="Gemini API Key"
          value={settings.geminiKey}
          onChange={handleChange}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>AI Model</InputLabel>
          <Select
            name="aiModel"
            value={settings.aiModel}
            onChange={handleChange}
            label="AI Model"
          >
            <ListSubheader sx={{ fontWeight: 'bold', bgcolor: 'background.default' }}>
              OpenAI Models
            </ListSubheader>
            <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
            <MenuItem value="gpt-4">GPT-4</MenuItem>
            
            <ListSubheader sx={{ fontWeight: 'bold', bgcolor: 'background.default', mt: 1 }}>
              Gemini Models
            </ListSubheader>
            <MenuItem value="gemini-1.5-flash">Gemini 1.5 Flash</MenuItem>
            <MenuItem value="gemini-1.5-pro">Gemini 1.5 Pro</MenuItem>
            <MenuItem value="gemini-2.0-flash">Gemini 2.0 Flash</MenuItem>
            <MenuItem value="gemini-2.0-pro">Gemini 2.0 Pro</MenuItem>
            <MenuItem value="gemini-2.0-flash-thinking">Gemini 2.0 Flash Thinking</MenuItem>
            <MenuItem value="gemini-2.0-experimental">Gemini 2.0 Experimental</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="gptSystemPrompt"
          label="System Prompt"
          multiline
          rows={4}
          value={settings.gptSystemPrompt}
          onChange={handleChange}
        />
        <TextField
  fullWidth
  margin="normal"
  name="silenceTimerDuration"
  label="Silence Detection (seconds)"
  type="number"
  inputProps={{ step: 0.2, min: 0.5, max: 5 }}
  value={settings.silenceTimerDuration}
  onChange={handleChange}
/>

<FormControl fullWidth margin="normal">
  <InputLabel>Response Length</InputLabel>
  <Select
    name="responseLength"
    value={settings.responseLength}
    onChange={handleChange}
    label="Response Length"
  >
    <MenuItem value="concise">Concise (short and direct)</MenuItem>
    <MenuItem value="medium">Medium (balanced)</MenuItem>
    <MenuItem value="lengthy">Lengthy (detailed explanations)</MenuItem>
  </Select>
</FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="azureToken"
          label="Azure Speech Token"
          value={settings.azureToken}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="azureRegion"
          label="Azure Region"
          value={settings.azureRegion}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="azureLanguage"
          label="Azure Recognition Language"
          value={settings.azureLanguage}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

SettingsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func
};