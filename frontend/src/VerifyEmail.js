import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        
        // Store token for automatic login when user clicks the button
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to connect to server. Please try again later.');
    }
  };

  const goToMarketplace = () => {
    // Navigate to home page which will show marketplace if user is logged in
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full text-center">
        {status === 'verifying' && (
          <>
            <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {/* Data Privacy and Ethics Notice */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left max-h-48 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Data Privacy & Ethics</h3>
              <div className="text-xs text-gray-600 space-y-2">
                <p><strong>Data Usage:</strong> Your email address and profile information are used solely to facilitate marketplace transactions and communication between users. We do not sell or share your personal data with third parties.</p>
                <p><strong>Account Security:</strong> Your password is securely hashed and never stored in plain text. We use industry-standard encryption to protect your account information.</p>
                <p><strong>Communication:</strong> By using BruinMarket, you agree to receive transactional emails related to your account activity, including messages from other users and notifications about your listings.</p>
                <p><strong>Ethical Use:</strong> You agree to use BruinMarket responsibly, respecting other users and following UCLA's code of conduct. Prohibited activities include fraud, harassment, or selling illegal items.</p>
                <p><strong>Data Retention:</strong> Your account data is retained while your account is active. You may request account deletion at any time, which will remove your personal information from our system.</p>
              </div>
            </div>
            
            <button
              onClick={goToMarketplace}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              Go to Marketplace
            </button>
            <p className="text-sm text-gray-500 mt-4">You are now logged in!</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
