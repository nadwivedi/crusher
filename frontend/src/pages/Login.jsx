import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const ICONS = {
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  phone: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
};

const Icon = ({ d, className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const Spinner = () => (
  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const inputClasses = "w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";
const buttonClasses = "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3.5 text-[15px] font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";
const linkClasses = "cursor-pointer text-sm font-semibold text-orange-600 hover:text-orange-800 hover:underline";

const IconInput = ({ icon, ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
      <Icon d={ICONS[icon]} />
    </span>
    <input className={inputClasses} {...props} />
  </div>
);

const PasswordInput = ({ show, setShow, ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
      <Icon d={ICONS.lock} />
    </span>
    <input type={show ? 'text' : 'password'} className={`${inputClasses} pr-11`} {...props} />
    <button
      type="button"
      onClick={() => setShow(!show)}
      className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600"
      title="Toggle password visibility"
    >
      <Icon d={show ? ICONS.eye : ICONS.eyeOff} />
    </button>
  </div>
);

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

  const switchMode = () => {
    setIsLogin(!isLogin);
    setEmailOrPhone('');
    setPassword('');
    setFormData({
      companyName: '',
      phone: '',
    });
  };

  const title = isLogin ? 'Login to CrusherBook' : 'Create your account';
  const subtitle = isLogin
    ? 'Welcome back 👋 Sign in to manage your sales, stock and billing.'
    : 'Register your company to start managing your crusher with CrusherBook.';

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100 p-4 sm:p-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="grid w-full max-w-[1000px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-300/60 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/[0.06]"></div>
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/[0.05]"></div>
          <div className="pointer-events-none absolute bottom-16 right-12 h-24 w-24 rounded-full bg-orange-400/15"></div>

          <div className="relative">
            <p className="text-[2.5rem] font-bold leading-[1.15]">
              Your Crusher,
              <br />
              Simplified.
            </p>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-slate-300">
              Manage sales, purchases, stock and billing from one simple dashboard.
            </p>
            <div className="mt-10 flex items-center gap-3 border-t border-white/30 pt-6">
              <Icon d={ICONS.shield} className="h-6 w-6" />
              <span className="font-medium">Safe &amp; Secure</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-12">
          <div className="mb-10 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 sm:h-14 sm:w-14">
              <Icon d={ICONS.building} className="h-7 w-7 text-white sm:h-8 sm:w-8" />
            </div>
            <span className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Crusher<span className="text-orange-600">Book</span>
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-[1.75rem] font-bold text-slate-900 sm:text-[2rem]">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          {isLogin ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
                {[['owner', 'Owner Login'], ['staff', 'Staff Login']].map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLoginType(type)}
                    className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-semibold transition ${
                      loginType === type ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <IconInput
                  icon="phone"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder={loginType === 'owner' ? 'Mobile Number or Email' : 'Staff Mobile Number'}
                  required
                />
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showPassword}
                  setShow={setShowPassword}
                  placeholder="Password"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className={`${buttonClasses} mt-6`}>
                {loading ? (
                  <>
                    <Spinner />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <Icon d={ICONS.login} />
                    <span>{loginType === 'staff' ? 'Staff Login' : 'Login'}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div className="space-y-4">
                <IconInput
                  icon="building"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Company Name"
                  required
                />
                <IconInput
                  icon="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Mobile Number"
                  maxLength="10"
                  required
                />
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showPassword}
                  setShow={setShowPassword}
                  placeholder="Password (min. 6 characters)"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className={`${buttonClasses} mt-6`}>
                {loading ? (
                  <>
                    <Spinner />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          )}

          <p className="mt-10 text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={switchMode} className={linkClasses}>
              {isLogin ? 'Register Now' : 'Login'}
            </button>
          </p>

          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
            Developed by{' '}
            <a
              href="https://softwarebytes.in/"
              target="_blank"
              rel="noopener"
              className="font-semibold text-slate-600 hover:text-orange-600 hover:underline"
            >
              SoftwareBytes
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
