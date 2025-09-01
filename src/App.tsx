import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LoginPage } from '@/pages/Login';
import { ExpensesGridPage } from '@/pages/ExpensesGrid';
import { NewExpensePage } from '@/pages/NewExpense';
import { useAuthStore } from '@/stores/authStore';
import { getCurrentUser } from '@/api/auth';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function Navbar() {
  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          אפליקציה לניהול הוצאות
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" component={Link} to="/login">
            רישום
          </Button>
          <Button color="inherit" component={Link} to="/expenses">
            הוצאות
          </Button>
         
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const { setUser, clearUser, setLoading } = useAuthStore();

  React.useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        clearUser();
      }
    }

    fetchCurrentUser();
  }, [setUser, clearUser, setLoading]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/expenses" element={<ExpensesGridPage />}>
              <Route path="new" element={<NewExpensePage />} />
            </Route>
            <Route path="/" element={<ExpensesGridPage />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;