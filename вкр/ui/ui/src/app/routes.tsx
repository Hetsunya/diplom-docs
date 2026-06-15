import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { Dashboard } from "./pages/Dashboard";
import { CallPage } from "./pages/CallPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full size-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full size-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function Root({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Root children={<Navigate to="/login" replace />} />
    ),
  },
  {
    path: "/login",
    element: (
      <Root
        children={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
    ),
  },
  {
    path: "/signup",
    element: (
      <Root
        children={
          <PublicRoute>
            <SignUpPage />
          </PublicRoute>
        }
      />
    ),
  },
  {
    path: "/dashboard",
    element: (
      <Root
        children={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    ),
  },
  {
    path: "/call",
    element: (
      <Root
        children={
          <ProtectedRoute>
            <CallPage />
          </ProtectedRoute>
        }
      />
    ),
  },
  {
    path: "/reports",
    element: (
      <Root
        children={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
    ),
  },
  {
    path: "*",
    element: (
      <Root children={<Navigate to="/login" replace />} />
    ),
  },
]);