import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

/**
 * Route protector that limits access to logged in users and specific roles
 * @param {Array} allowedRoles - Optional array of roles allowed (e.g. ['doctor', 'admin'])
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullPage={true} />;
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if user has a role that is not permitted
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
