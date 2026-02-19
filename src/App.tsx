import { Route, Routes, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';

import Agenda from './pages/Agenda';
import Reports from './pages/Reports';
import ActivityFeed from './pages/ActivityFeed';
import Playground from './pages/Playground';

import AdminUsers from './pages/AdminUsers'; // Import Admin Page
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DistrictProvider } from './context/DistrictContext';

import PlaygroundSaas from './pages/PlaygroundSaas';
import PlaygroundDesignSystem from './pages/PlaygroundDesignSystem';
import { ThemeProvider } from './context/DesignSystem/ThemeContext';

import UnifiedEntry from './pages/UnifiedEntry';
import BrandingPreview from './pages/BrandingPreview';
import SuggestedBitacoras from './pages/SuggestedBitacoras';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DistrictProvider>
          <Routes>
            {/* Public Route: The new Map-First Login */}
            {/* Now serving as the main entry point for everything */}
            <Route path="/" element={<UnifiedEntry />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Protected Layout Routes */}
            <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/activities" element={<ActivityFeed />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/admin" element={<AdminUsers />} /> {/* Admin Route */}
              <Route path="/suggested-bitacoras" element={<SuggestedBitacoras />} />
              <Route path="/map" element={<div className="p-10">Map Full View (Coming Soon)</div>} />
              <Route path="/leaders" element={<div className="p-10">Leaders Management (Coming Soon)</div>} />
              <Route path="/analytics" element={<div className="p-10">Analytics Dashboard (Coming Soon)</div>} />
            </Route>

            {/* Playground - Keep accessible for dev, or protect if desired */}
            <Route path="/playground" element={<Playground />} />
            <Route path="/playground-saas" element={<PlaygroundSaas />} />
            <Route path="/design-system" element={<PlaygroundDesignSystem />} />
            <Route path="/branding-preview" element={<BrandingPreview />} />
          </Routes>
        </DistrictProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
