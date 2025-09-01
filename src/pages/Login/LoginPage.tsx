import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { PageContainer } from '@/shared/ui';

export function LoginPage() {
  return (
    <PageContainer>
      <Box display="flex" justifyContent="center">
        <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Login
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            Login page coming soon...
          </Typography>
        </Paper>
      </Box>
    </PageContainer>
  );
}