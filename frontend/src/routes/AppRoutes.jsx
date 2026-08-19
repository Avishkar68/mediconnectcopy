import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import VerifyOtp from '../pages/VerifyOtp';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import Community from '../pages/Community';

// Patient Workspace Pages
import PatientOverview from '../pages/patient/PatientOverview';
import PatientHealth from '../pages/patient/PatientHealth';
import PatientRecords from '../pages/patient/PatientRecords';
import PatientTimeline from '../pages/patient/PatientTimeline';
import PatientMedications from '../pages/patient/PatientMedications';
import PatientCarePlan from '../pages/patient/PatientCarePlan';
import PatientAppointments from '../pages/patient/PatientAppointments';
import PatientDoctors from '../pages/patient/PatientDoctors';
import PatientNotifications from '../pages/patient/PatientNotifications';

// Doctor Workspace Pages
import DoctorOverview from '../pages/doctor/DoctorOverview';
import DoctorPatients from '../pages/doctor/DoctorPatients';
import DoctorRequests from '../pages/doctor/DoctorRequests';
import DoctorConsultations from '../pages/doctor/DoctorConsultations';
import DoctorPrescriptions from '../pages/doctor/DoctorPrescriptions';
import DoctorCarePlans from '../pages/doctor/DoctorCarePlans';
import DoctorFollowups from '../pages/doctor/DoctorFollowups';
import DoctorTrends from '../pages/doctor/DoctorTrends';
import DoctorNotifications from '../pages/doctor/DoctorNotifications';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />

      {/* Protected Core Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        {/* Dynamic Index based on logged-in role */}
        <Route 
          index 
          element={
            user?.role === 'doctor' 
              ? <DoctorOverview /> 
              : <PatientOverview />
          } 
        />

        {/* Patient Only Sub-routes */}
        <Route path="health" element={<ProtectedRoute allowedRoles={['patient']}><PatientHealth /></ProtectedRoute>} />
        <Route path="records" element={<ProtectedRoute allowedRoles={['patient']}><PatientRecords /></ProtectedRoute>} />
        <Route path="timeline" element={<ProtectedRoute allowedRoles={['patient']}><PatientTimeline /></ProtectedRoute>} />
        <Route path="medications" element={<ProtectedRoute allowedRoles={['patient']}><PatientMedications /></ProtectedRoute>} />
        <Route path="care-plan" element={<ProtectedRoute allowedRoles={['patient']}><PatientCarePlan /></ProtectedRoute>} />
        <Route path="appointments" element={<ProtectedRoute allowedRoles={['patient']}><PatientAppointments /></ProtectedRoute>} />
        <Route path="doctors" element={<ProtectedRoute allowedRoles={['patient']}><PatientDoctors /></ProtectedRoute>} />

        {/* Doctor Only Sub-routes */}
        <Route path="patients" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPatients /></ProtectedRoute>} />
        <Route path="requests" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorRequests /></ProtectedRoute>} />
        <Route path="consultations" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorConsultations /></ProtectedRoute>} />
        <Route path="prescriptions" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPrescriptions /></ProtectedRoute>} />
        <Route path="care-plans" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorCarePlans /></ProtectedRoute>} />
        <Route path="follow-ups" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorFollowups /></ProtectedRoute>} />
        <Route path="trends" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorTrends /></ProtectedRoute>} />

        {/* Shared Route with Dynamic View based on role */}
        <Route 
          path="notifications" 
          element={
            user?.role === 'doctor' 
              ? <ProtectedRoute allowedRoles={['doctor']}><DoctorNotifications /></ProtectedRoute>
              : <ProtectedRoute allowedRoles={['patient']}><PatientNotifications /></ProtectedRoute>
          } 
        />
      </Route>

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Community />
          </ProtectedRoute>
        }
      />

      {/* Catch-all Routing */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
