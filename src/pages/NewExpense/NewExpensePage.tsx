import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { PageContainer } from '@/shared/ui';

export function NewExpensePage() {
  return (
    <PageContainer>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Add New Expense
        </Typography>
        <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
          <Typography variant="body1" color="text.secondary">
            New expense form coming soon...
          </Typography>
        </Paper>
      </Box>
    </PageContainer>
  );
}