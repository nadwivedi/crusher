import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function Login() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loginType, setLoginType] = useState('owner'); // 'owner' or 'staff'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    phone: '',
  });

  const { login, employeeLogin, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!emailOrPhone || !password) {
      toast.error('Please fill all fields');
      return;
    }

    let result;
    if (loginType === 'staff') {
      result = await employeeLogin(emailOrPhone, password);
    } else {
      result = await login(emailOrPhone, password);
    }

    if (result.success) {
      toast.success(loginType === 'staff' ? 'Staff Login successful!' : 'Login successful!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.phone || !password) {
      toast.error('Please fill all required fields');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = await register({
      ...formData,
      password
    });

    if (result.success) {
      toast.success('Registration successful! Welcome aboard.');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const inputClasses = "w-full px-4 py-2 sm:py-3 bg-white/50 border-2 border-orange-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-orange-500 transition-all duration-300 text-gray-800 text-sm placeholder-gray-400";
  const labelClasses = "block text-[13px] sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2";

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-500 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 right-32 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold mb-4 text-center">Crusher Management</h2>
          <p className="text-orange-100 text-center text-lg max-w-md">Streamline your industrial operations with powerful inventory and billing management</p>
          
          <div className="mt-12 grid grid-cols-2 gap-6 max-w-md">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-orange-100 text-sm">Support</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-orange-100 text-sm">Secure</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-4 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mb-2 sm:mb-4 shadow-lg shadow-orange-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Crusher Management</h1>
            <p className="text-gray-500 text-sm">Software</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-orange-900/10 p-5 sm:p-8 border border-orange-100">
            <div className="mb-3 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-0.5 sm:mb-1">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-500 text-[12px] sm:text-sm">
                {isLogin ? 'Sign in to continue to your dashboard' : 'Register your company to get started'}
              </p>
            </div>

            <div className="flex bg-orange-50 p-1 rounded-xl mb-4 sm:mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 sm:py-3 px-4 rounded-lg font-semibold text-[13px] sm:text-sm transition-all duration-300 ${
                  isLogin
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-orange-600 hover:bg-orange-100'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 sm:py-3 px-4 rounded-lg font-semibold text-[13px] sm:text-sm transition-all duration-300 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-orange-600 hover:bg-orange-100'
                }`}
              >
                Register
              </button>
            </div>

            {isLogin ? (
              <>
                <div className="flex border-b border-orange-200 mb-4 sm:mb-6">
                  <button
                    onClick={() => setLoginType('owner')}
                    className={`flex-1 py-1 sm:py-2 font-semibold text-[12px] sm:text-sm transition border-b-2 ${
                      loginType === 'owner' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Owner Login
                  </button>
                  <button
                    onClick={() => setLoginType('staff')}
                    className={`flex-1 py-1 sm:py-2 font-semibold text-[12px] sm:text-sm transition border-b-2 ${
                      loginType === 'staff' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Staff Login
                  </button>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className={labelClasses}>{loginType === 'owner' ? 'Email / Mobile' : 'Staff Mobile Number'}</label>
                    <input
                      type="text"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className={inputClasses}
                      placeholder={loginType === 'owner' ? "Enter email or mobile" : "Enter staff mobile"}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClasses}
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 p-1 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 sm:py-4 px-6 rounded-xl font-semibold text-sm sm:text-base hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : (loginType === 'staff' ? 'Staff Login' : 'Owner Login')}
                  </button>
                </form>
              </>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className={labelClasses}>Company *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={inputClasses}
                    placeholder="ABC Crushers"
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>Mobile *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={inputClasses}
                    placeholder="9876543210"
                    maxLength="10"
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClasses}
                    placeholder="Min 6 chars"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 sm:py-4 px-6 rounded-xl font-semibold text-sm sm:text-base hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            )}

            <p className="text-center text-gray-500 text-[12px] sm:text-sm mt-4 sm:mt-6">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmailOrPhone('');
                  setPassword('');
                  setFormData({
                    companyName: '',
                    phone: '',
                  });
                }}
                className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
              >
                {isLogin ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>

          <p className="text-center text-gray-400 text-[10px] sm:text-xs mt-4 sm:mt-6">
            &copy; 2026 Crusher Management Software. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
