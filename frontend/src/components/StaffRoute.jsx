import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canUseSection, isStaff } from '../utils/staffAccess';

// Keeps staff out of pages they are not given: owner-only pages, or a part of the app switched off for them
export default function StaffRoute({ section, ownerOnly = false, children }) {
  const { user } = useAuth();
  if (isStaff(user) && (ownerOnly || (section && !canUseSection(user, section)))) {
    return <Navigate to="/" replace />;
  }
  return children;
}
