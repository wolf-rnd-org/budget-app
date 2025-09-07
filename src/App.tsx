import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LoginPage } from '@/pages/Login';
import { ExpensesGridPage } from '@/pages/ExpensesGrid';
import { NewExpensePage } from '@/pages/NewExpense';
import { UserManagementPage } from '@/pages/UserManagement';
import { AssistantsManagementPage } from '@/pages/AssistantsManagement';
import { ProtectedRoute, UserProfile } from '@/components';
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
  const { user, hydrateFromMe } = useAuthStore();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              אפליקציה לניהול הוצאות
            </Link>
            
            {user && (
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/expenses"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  הוצאות
                </Link>
                <Link
                  to="/users"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  ניהול משתמשים
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <UserProfile />
            ) : (
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                התחבר
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
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
            <Route 
              path="/expenses" 
              element={
                <ProtectedRoute>
                  <ExpensesGridPage />
                </ProtectedRoute>
              }
            >
              <Route 
                path="new" 
                element={
                  <ProtectedRoute requiredFeatures={['expenses.create']}>
                    <NewExpensePage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route 
              path="/users" 
              element={
                <ProtectedRoute requiredFeatures={['users.create']}>
                  <UserManagementPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile/assistants" 
              element={
                <ProtectedRoute requiredFeatures={['expenses.view']}>
                  <AssistantsManagementPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <ExpensesGridPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
