import React from 'react';
import { Box, Typography, Paper, Card, CardContent, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '../api/useQuery';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: keysData, loading: keysLoading } = useQuery<number>('/api/keys', {
    select: (raw) => raw.allKeys?.length || 0,
  });
  const { data: langsData, loading: langsLoading } = useQuery<number>('/api/languages', {
    select: (raw) => (Array.isArray(raw) ? raw : raw?.languages ?? []).length,
  });
  const { data: tempsData, loading: tempsLoading } = useQuery<number>('/api/templates', {
    select: (raw) => (Array.isArray(raw) ? raw : []).length,
  });

  const loading = keysLoading || langsLoading || tempsLoading;
  const stats = { keys: keysData ?? 0, languages: langsData ?? 0, templates: tempsData ?? 0 };

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
