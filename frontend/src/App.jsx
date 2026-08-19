import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-dark-950 text-slate-100">
          <Navbar />
          <main className="flex-1">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
