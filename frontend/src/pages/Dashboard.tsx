import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Card, CardContent, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ keys: 0, languages: 0, templates: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [keysRes, langRes, tempRes] = await Promise.all([
          api.get('/api/keys'),
          api.get('/api/languages'),
          api.get('/api/templates')
        ]);
        setStats({
          keys: keysRes.data.allKeys?.length || 0,
          languages: langRes.data?.length || 0,
          templates: tempRes.data?.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box>
      <Typography variant="h4" mb={1} fontWeight="bold">Welcome, {user?.email}</Typography>
      <Typography variant="subtitle1" color="text.secondary" mb={4}>
        Here's a quick overview of your EdTech platform usage.
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Box>
            <Card elevation={2}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active API Keys
                </Typography>
                <Typography variant="h3" color="primary">
                  {stats.keys}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card elevation={2}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Available Languages
                </Typography>
                <Typography variant="h3" color="secondary">
                  {stats.languages}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card elevation={2}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Saved Templates
                </Typography>
                <Typography variant="h3" color="info.main">
                  {stats.templates}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h6" mb={2}>Getting Started</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          1. Navigate to <strong>API Keys</strong> to generate a key for your programmatic requests.
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          2. Use the <strong>Languages</strong> tab to manage the target languages for translation.
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          3. Explore the <strong>Translation Demo</strong> to see the AI models in action.
        </Typography>
      </Paper>
    </Box>
  );
};
