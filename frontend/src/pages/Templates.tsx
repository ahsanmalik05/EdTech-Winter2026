import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Chip } from '@mui/material';
import { Delete, Autorenew } from '@mui/icons-material';
import { api } from '../api/api';
import { toast } from 'react-hot-toast';

interface Template {
  id: number;
  type: string;
  name: string;
  subject: string;
  gradeLevel: string;
  content: string;
  status: string;
}

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/templates');
      setTemplates(res.data);
    } catch (err) {
      toast.error('Failed to load templates');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post('/api/templates/generate', { 
        type: 'lesson_plan', 
        subject, 
        gradeLevel, 
        topic 
      });
      toast.success('Template generated!');
      setOpen(false);
      setSubject('');
      setGradeLevel('');
      setTopic('');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/api/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Educational Templates</Typography>
        <Button variant="contained" color="info" onClick={() => setOpen(true)}>
          Generate New Template
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name / Title</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Grade Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell><strong>{t.name}</strong></TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.gradeLevel}</TableCell>
                <TableCell>
                  <Chip label={t.status} size="small" color={t.status === 'active' ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => handleDelete(t.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">No templates found. Generate one!</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Generate New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Subject (e.g. Science)"
            fullWidth
            variant="outlined"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Grade Level (e.g. 8th Grade)"
            fullWidth
            variant="outlined"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Topic (e.g. Photosynthesis)"
            fullWidth
            variant="outlined"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleGenerate} color="info" variant="contained" disabled={loading} startIcon={loading ? <Autorenew sx={{ animation: 'spin 2s linear infinite' }}/> : null}>
            {loading ? 'Generating...' : 'Generate with AI'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
