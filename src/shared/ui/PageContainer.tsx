import React from 'react';
import { Container } from '@mui/material';

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {children}
    </Container>
  );
}