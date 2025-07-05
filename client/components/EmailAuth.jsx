import { useState } from 'react';
import { Mail, Lock, CheckCircle } from 'react-feather';
import Button from './Button';

export default function EmailAuth({ onAuthenticated }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);
  const [error, setError] = useState(null);

  const handleGmailAuth = async () => {
    setIsAuthenticating(true);
    setError(null);
    
    try {
      // In a real implementation, this would use Google OAuth
      // For now, we'll simulate the authentication
      const mockGmailTokens = {
        access_token: 'mock_gmail_token',
        refresh_token: 'mock_refresh_token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        token_type: 'Bearer',
        expires_in: 3600
      };

      const response = await fetch('/api/auth/gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens: mockGmailTokens }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthProvider('gmail');
        onAuthenticated('gmail');
      } else {
        throw new Error('Gmail authentication failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };



  if (authProvider) {
    return (
      <div className="bg-green-50 p-4 rounded-md">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle size={20} />
          <span className="font-medium">
            Connected to Gmail
          </span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          You can now use voice commands to manage your emails
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Lock className="mx-auto mb-2 text-gray-500" size={32} />
        <h3 className="text-lg font-semibold mb-2">Connect Your Gmail</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect your Gmail account to start managing your inbox with voice commands
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleGmailAuth}
          disabled={isAuthenticating}
          className="w-full bg-red-600 hover:bg-red-700"
          icon={<Mail size={16} />}
        >
          {isAuthenticating ? 'Connecting...' : 'Connect Gmail'}
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>We use secure OAuth to connect to your email.</p>
        <p>Your credentials are never stored on our servers.</p>
      </div>
    </div>
  );
} 