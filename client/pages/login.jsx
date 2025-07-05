import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, AlertCircle } from "react-feather";
import Button from "../components/Button";
import logo from "/assets/openai-logomark.svg";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState(null);

  useEffect(() => {
    // Check OAuth configuration
    const checkConfig = async () => {
      try {
        const response = await fetch('/auth/config-test');
        const config = await response.json();
        setConfigStatus(config);
        
        if (!config.configured) {
          setError('OAuth credentials not configured. Please set up Google OAuth in config.env');
          return;
        }
      } catch (err) {
        console.error('Config check failed:', err);
      }
    };

    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/auth/status');
        const data = await response.json();
        if (data.authenticated) {
          navigate('/');
        }
      } catch (err) {
        // User is not authenticated, stay on login page
      }
    };
    
    checkConfig();
    checkAuth();

    // Check for OAuth error
    const authError = searchParams.get('error');
    if (authError === 'auth_failed') {
      setError('Authentication failed. Please check your OAuth credentials and try again.');
    }
  }, [navigate, searchParams]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Redirect to OAuth flow
      window.location.href = '/auth/login';
    } catch (err) {
      setError('Failed to start authentication process');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img className="mx-auto h-12 w-auto" src={logo} alt="AI Email Assistant" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            AI Email Assistant
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Transform your commute into productive email management time
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-6">
            <div className="text-center">
              <Lock className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Connect Your Gmail
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Sign in with your Google account to start managing your emails with voice commands
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                    {configStatus && !configStatus.configured && (
                      <div className="mt-2 text-xs text-red-700">
                        <p><strong>Setup Required:</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Go to Google Cloud Console</li>
                          <li>Create OAuth 2.0 credentials</li>
                          <li>Update config.env with real credentials</li>
                          <li>Restart the server</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button
                onClick={handleLogin}
                disabled={loading || (configStatus && !configStatus.configured)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                icon={<Mail className="h-5 w-5" />}
              >
                {loading ? 'Connecting...' : 
                 configStatus && !configStatus.configured ? 'OAuth Setup Required' :
                 'Sign in with Google'}
              </Button>
            </div>

            <div className="text-center">
              <div className="text-xs text-gray-500 space-y-1">
                <p>We use secure OAuth 2.0 to connect to your Gmail</p>
                <p>Your credentials are never stored on our servers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              🎯 Perfect for:
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Managing emails during your commute</li>
              <li>• Hands-free email triaging and responses</li>
              <li>• Achieving Inbox Zero with AI assistance</li>
              <li>• Accessible email management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 