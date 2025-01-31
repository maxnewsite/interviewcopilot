import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { getConfig, setConfig } from '../utils/config';

export default function SettingsDialog({ open, onClose }) {
  const [settings, setSettings] = useState(getConfig());

  useEffect(() => {
    setSettings(getConfig());
  }, [open]);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setConfig(settings);
    onClose();
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
        <FormControl fullWidth margin="normal">
          <InputLabel>GPT Model</InputLabel>
          <Select
            name="gptModel"
            value={settings.gptModel}
            onChange={handleChange}
          >
            <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
            <MenuItem value="gpt-4">GPT-4</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="gptSystemPrompt"
          label="GPT System Prompt"
          multiline
          rows={4}
          value={settings.gptSystemPrompt}
          onChange={handleChange}
        />
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
