import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, TextField, MenuItem, CircularProgress } from '@mui/material';
import { api } from '../api/api';
import { toast } from 'react-hot-toast';

export const Translate: React.FC = () => {
  const [languages, setLanguages] = useState<{code: string; name: string}[]>([]);
  const [targetLang, setTargetLang] = useState('fr');
  const [textToTranslate, setTextToTranslate] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchLangs = async () => {
      try {
        const res = await api.get('/api/languages');
        setLanguages(res.data);
      } catch (err) {
        toast.error('Could not load languages. Use default.');
      }
    };
    fetchLangs();
  }, []);

  const handleTranslateText = async () => {
    if (!textToTranslate) return;
    setLoading(true);
    setTranslatedText('');
    try {
      const res = await api.post('/api/translate/batch', {
        items: [{ id: '1', text: textToTranslate }],
        targetLanguage: languages.find(l => l.code === targetLang)?.name || 'French'
      });
      if (res.data.results && res.data.results['1']) {
        setTranslatedText(res.data.results['1'].translatedText || 'No translation returned.');
      }
    } catch (err: any) {
      toast.error('Translation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateFile = async () => {
    if (!file) {
      toast.error('Please select a PDF file first.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('targetLanguage', languages.find(l => l.code === targetLang)?.name || 'French');

    try {
      const res = await api.post('/api/translate/pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setTranslatedText(res.data.translatedContent || 'PDF Translated Successfully without text return');
      toast.success('PDF translation complete');
    } catch (err: any) {
      toast.error('PDF Translation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>AI Translation Studio</Typography>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" mb={2}>Select Target Language</Typography>
        <TextField
          select
          fullWidth
          label="Language"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          sx={{ mb: 3 }}
        >
          {languages.length > 0 ? languages.map((option) => (
            <MenuItem key={option.code} value={option.code}>
              {option.name} ({option.code})
            </MenuItem>
          )) : (
            <MenuItem value="fr">French (fr)</MenuItem>
          )}
        </TextField>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        <Box>
          <Paper sx={{ p: 4, height: '100%' }}>
            <Typography variant="h6" mb={2}>Text Translation Playground</Typography>
            <TextField
              multiline
              rows={6}
              fullWidth
              variant="outlined"
              placeholder="Enter text to translate..."
              value={textToTranslate}
              onChange={(e) => setTextToTranslate(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              onClick={handleTranslateText}
              disabled={loading || !textToTranslate}
            >
              {loading ? <CircularProgress size={24} /> : 'Translate Text'}
            </Button>
          </Paper>
        </Box>
        
        <Box>
          <Paper sx={{ p: 4, height: '100%' }}>
            <Typography variant="h6" mb={2}>PDF Translation</Typography>
            <Box sx={{ border: '2px dashed rgba(255,255,255,0.2)', p: 4, textAlign: 'center', borderRadius: 2, mb: 2 }}>
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="raised-button-file">
                <Button variant="outlined" component="span">
                  {file ? file.name : 'Upload PDF'}
                </Button>
              </label>
            </Box>
            <Button 
              variant="contained" 
              color="secondary" 
              fullWidth 
              onClick={handleTranslateFile}
              disabled={loading || !file}
            >
              {loading ? <CircularProgress size={24} /> : 'Translate PDF'}
            </Button>
          </Paper>
        </Box>

        <Box sx={{ gridColumn: { xs: '1', md: '1 / span 2' } }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" mb={2} color="secondary.main">Translation Results</Typography>
            <Box sx={{ minHeight: 150, p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
              {translatedText ? (
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{translatedText}</Typography>
              ) : (
                <Typography color="text.secondary" fontStyle="italic">Your translation results will appear here...</Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};
