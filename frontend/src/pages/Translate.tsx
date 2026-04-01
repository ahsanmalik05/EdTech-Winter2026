import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, TextField, CircularProgress, Autocomplete } from '@mui/material';
import { api } from '../api/api';
import { toast } from 'react-hot-toast';
import { useQuery } from '../api/useQuery';

export const Translate: React.FC = () => {
  const { data: languages = [] } = useQuery<{code: string; name: string}[]>(
    '/api/languages',
    { select: (raw) => Array.isArray(raw) ? raw : (raw.languages || []) },
  );
  const [targetLang, setTargetLang] = useState<{code: string; name: string} | null>(null);
  const [textToTranslate, setTextToTranslate] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (languages.length > 0 && !targetLang) {
      const french = languages.find((l) => l.code === 'fr');
      if (french) setTargetLang(french);
    }
  }, [languages, targetLang]);

  const handleTranslateText = async () => {
    if (!textToTranslate || !targetLang) return;
    setLoading(true);
    setTranslatedText('');
    try {
      const res = await api.post('/api/translate/batch', {
        items: [{ id: '1', text: textToTranslate }],
        targetLanguage: targetLang.name
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
    if (!file || !targetLang) {
      toast.error('Please select a PDF file and target language.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('targetLanguage', targetLang.name);

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
        <Autocomplete
          fullWidth
          options={languages}
          value={targetLang}
          onChange={(_, newValue) => setTargetLang(newValue)}
          getOptionLabel={(option) => `${option.name} (${option.code})`}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Language"
              placeholder="Search languages..."
            />
          )}
          sx={{ mb: 3 }}
        />
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
