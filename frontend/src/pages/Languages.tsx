import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { api } from '../api/api';
import { toast } from 'react-hot-toast';
import { useQuery, invalidateQueries } from '../api/useQuery';

interface Language {
  id: number;
  code: string;
  name: string;
}

export const Languages: React.FC = () => {
  const { data: languages = [], refetch } = useQuery<Language[]>('/api/languages');
  const [open, setOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    try {
      await api.post('/api/languages', { code: newCode, name: newName });
      toast.success('Language added');
      setOpen(false);
      setNewCode('');
      setNewName('');
      invalidateQueries('/api/languages');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add language');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this language?')) return;
    try {
      await api.delete(`/api/languages/${id}`);
      toast.success('Language deleted');
      invalidateQueries('/api/languages');
      refetch();
    } catch (err) {
      toast.error('Failed to delete language');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Languages</Typography>
        <Button variant="contained" color="secondary" onClick={() => setOpen(true)}>
          Add Language
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {languages.map((l) => (
              <TableRow key={l.id}>
                <TableCell><strong>{l.code}</strong></TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => handleDelete(l.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {languages.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">No languages available.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Language</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Language Code (e.g. fr)"
            fullWidth
            variant="outlined"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Language Name (e.g. French)"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} color="secondary" variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
