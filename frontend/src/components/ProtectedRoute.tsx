import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, isAuth }: { children: JSX.Element, isAuth: boolean }) {
  return isAuth ? children : <Navigate to="/login" />
}
