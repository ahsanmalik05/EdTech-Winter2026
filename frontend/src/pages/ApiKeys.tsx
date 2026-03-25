import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, IconButton } from '@mui/material';
import { Delete, ContentCopy } from '@mui/icons-material';
import { api } from '../api/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface ApiKey {
  id: number;
  key: string;
  label: string;
  scopes: string[];
  createdAt: string;
}

export const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const { setApiKey, apiKey: activeApiKey } = useAuth();

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/keys');
      setKeys(res.data.allKeys || res.data);
    } catch (err: any) {
      toast.error('Failed to load API keys');
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/api/keys', { label: newLabel, scopes: ['read', 'write'] });
      toast.success('API Key created successfully!');
      setOpen(false);
      setNewLabel('');
      fetchKeys();
    } catch (err: any) {
      toast.error('Failed to create API key');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this key?')) return;
    try {
      await api.delete(`/api/keys/${id}`);
      toast.success('Key deleted');
      fetchKeys();
    } catch (err) {
      toast.error('Failed to delete key');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">API Keys</Typography>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          Create New Key
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>Key prefix</TableCell>
              <TableCell>Scopes</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id} sx={{ bgcolor: activeApiKey === k.key ? 'rgba(99, 102, 241, 0.1)' : 'transparent' }}>
                <TableCell>{k.label}</TableCell>
                <TableCell>
                  {k.key}
                  <IconButton size="small" onClick={() => {
                    navigator.clipboard.writeText(k.key);
                    toast.success('Copied to clipboard');
                  }}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell>
                  {k.scopes?.map((s) => <Chip key={s} label={s} size="small" sx={{ mr: 0.5 }} />)}
                </TableCell>
                <TableCell>{new Date(k.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Button 
                    size="small" 
                    variant={activeApiKey === k.key ? "contained" : "outlined"} 
                    color="secondary" 
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setApiKey(k.key);
                      toast.success(`Active key set to ${k.label}`);
                    }}
                  >
                    {activeApiKey === k.key ? 'Active' : 'Use Key'}
                  </Button>
                  <IconButton color="error" onClick={() => handleDelete(k.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">No API keys found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Label"
            fullWidth
            variant="outlined"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} color="primary" variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
