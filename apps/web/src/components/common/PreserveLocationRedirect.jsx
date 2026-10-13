import { Navigate, useLocation } from 'react-router-dom';

export default function PreserveLocationRedirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}
