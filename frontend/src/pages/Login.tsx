import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Link as MuiLink } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Typography variant="h4" mb={1} color="primary.main">EdTech</Typography>
        <Typography variant="body1" mb={3} color="text.secondary">Sign in to your account</Typography>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" variant="outlined" margin="normal" value={email} onChange={e => setEmail(e.target.value)} required type="email" />
          <TextField fullWidth label="Password" variant="outlined" margin="normal" value={password} onChange={e => setPassword(e.target.value)} required type="password" />
          <Button fullWidth variant="contained" color="primary" type="submit" sx={{ mt: 3, mb: 2, py: 1.5 }}>
            Login
          </Button>
        </form>
        <Typography variant="body2" color="text.secondary">
          Don't have an account? <MuiLink component={Link} to="/register" color="primary">Sign up</MuiLink>
        </Typography>
      </Paper>
    </Box>
  );
};
