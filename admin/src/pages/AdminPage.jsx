import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  Mountain,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  LogOut,
  User,
  Phone,
  MapPin,
  Clock,
  Loader2,
  AlertTriangle,
  Users2,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const ADMIN_AUTH_ENDPOINT = `${API_BASE_URL}/api/admin/auth`
const USERS_ENDPOINT = `${API_BASE_URL}/api/admin/users`

const emptyForm = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  state: '',
  district: '',
}

const formatDateTime = (value) => {
  if (!value) return 'Never'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid date'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '')
  return initials.join('') || '?'
}

const AVATAR_PALETTE = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-violet-400 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
]

const getAvatarGradient = (seed) => {
  const code = (seed || '').split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}

function AdminPage() {
  const [admin, setAdmin] = useState(null)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users

    return users.filter((user) =>
      [user.name, user.email, user.mobile, user.state, user.district]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [search, users])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(USERS_ENDPOINT, { withCredentials: true })
      setUsers(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const response = await axios.get(`${ADMIN_AUTH_ENDPOINT}/current`, { withCredentials: true })
        setAdmin(response.data?.data || null)
        await loadUsers()
      } catch {
        setAdmin(null)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAdminSession()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleMobileChange = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10)
    setForm((current) => ({ ...current, mobile: digitsOnly }))
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsModalOpen(false)
    setShowPassword(false)
  }

  const openCreateModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const handleEdit = (user) => {
    setEditingId(user.id)
    setForm({
      name: user.name || '',
      email: user.email || '',
      mobile: user.mobile || '',
      password: '',
      state: user.state || '',
      district: user.district || '',
    })
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        state: form.state.trim(),
        district: form.district.trim(),
      }

      if (form.password.trim()) {
        payload.password = form.password.trim()
      }

      if (!editingId && !payload.password) {
        toast.error('Password is required for new users')
        return
      }

      if (!/^\d{10}$/.test(payload.mobile)) {
        toast.error('Mobile number must be exactly 10 digits')
        return
      }

      if (editingId) {
        await axios.put(`${USERS_ENDPOINT}/${editingId}`, payload, { withCredentials: true })
        toast.success('User updated successfully')
      } else {
        await axios.post(USERS_ENDPOINT, payload, { withCredentials: true })
        toast.success('User created successfully')
      }

      resetForm()
      await loadUsers()
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to save user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    try {
      setIsDeleting(true)
      await axios.delete(`${USERS_ENDPOINT}/${userToDelete.id}`, { withCredentials: true })
      if (editingId === userToDelete.id) {
        resetForm()
      }
      toast.success('User deleted successfully')
      setUserToDelete(null)
      await loadUsers()
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAdminLogin = async (event) => {
    event.preventDefault()

    try {
      setIsLoggingIn(true)

      const response = await axios.post(
        `${ADMIN_AUTH_ENDPOINT}/login`,
        {
          email: loginForm.email.trim(),
          password: loginForm.password,
        },
        { withCredentials: true }
      )

      setAdmin(response.data?.data || null)
      setLoginForm({ email: '', password: '' })
      await loadUsers()
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Failed to login admin')
    } finally {
      setIsLoggingIn(false)
      setIsCheckingAuth(false)
    }
  }

  const handleAdminLogout = async () => {
    try {
      await axios.post(`${ADMIN_AUTH_ENDPOINT}/logout`, {}, { withCredentials: true })
    } catch {
      // Ignore logout request failure and clear local state anyway.
    } finally {
      setAdmin(null)
      setUsers([])
      setForm(emptyForm)
      setEditingId(null)
      setIsModalOpen(false)
      setSearch('')
    }
  }

  const toastTheme = { theme: 'dark' }

  if (isCheckingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-sm font-medium tracking-wide">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <form
          className="relative z-10 grid w-full max-w-md gap-5 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
          onSubmit={handleAdminLogin}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/30">
              <Mountain className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-400">Crusher Admin</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome back</h1>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Sign in with the single admin email and password created from the backend script.
            </p>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-300">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />
              <input
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="admin@example.com"
                autoComplete="username"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10.5 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                required
              />
            </div>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-300">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />
              <input
                name="password"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10.5 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showLoginPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {isLoggingIn ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : null}
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <ToastContainer position="top-right" autoClose={3500} {...toastTheme} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 lg:flex-row">
      <Sidebar userCount={users.length} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur-xl lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-400">Crusher Admin</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">User Management</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Manage application users, update their details, and track the latest login time from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[380px] sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <span className="text-xs text-slate-400">Admin</span>
              <strong className="mt-1.5 block truncate text-sm font-semibold text-white" title={admin.email}>
                {admin.email}
              </strong>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <span className="text-xs text-slate-400">Total Users</span>
              <strong className="mt-1.5 block text-2xl font-bold text-white">{users.length}</strong>
            </article>
            <article className="col-span-2 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:col-span-1">
              <div>
                <span className="text-xs text-slate-400">Session</span>
                <strong className="mt-1.5 block text-sm font-semibold text-white">Active</strong>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </article>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Users</h2>
              <p className="mt-0.5 text-sm text-slate-400">See, search, edit, and delete registered users.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  placeholder="Search users"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-9 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 sm:w-56"
                />
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-opacity hover:opacity-95"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add User
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-10 flex flex-col items-center justify-center gap-3 py-10 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-sky-400" />
              <p className="text-sm">Loading users...</p>
            </div>
          ) : filteredUsers.length ? (
            <>
              {/* Desktop table */}
              <div className="mt-6 hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-3">User</th>
                      <th className="pb-3 pr-3">Mobile</th>
                      <th className="pb-3 pr-3">Email</th>
                      <th className="pb-3 pr-3">Location</th>
                      <th className="pb-3 pr-3">Last Login</th>
                      <th className="pb-3 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 text-sm text-slate-300 transition-colors hover:bg-white/[0.03]">
                        <td className="py-3.5 pr-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarGradient(user.name || user.id)}`}
                            >
                              {getInitials(user.name)}
                            </div>
                            <span className="font-semibold text-white">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-3">{user.mobile}</td>
                        <td className="py-3.5 pr-3">{user.email || '-'}</td>
                        <td className="py-3.5 pr-3">{[user.district, user.state].filter(Boolean).join(', ') || '-'}</td>
                        <td className="py-3.5 pr-3 text-slate-400">{formatDateTime(user.lastLoginAt)}</td>
                        <td className="py-3.5 pr-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(user)}
                              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / tablet cards */}
              <div className="mt-6 grid gap-3 lg:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${getAvatarGradient(user.name || user.id)}`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-xs text-slate-400">{[user.district, user.state].filter(Boolean).join(', ') || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(user)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserToDelete(user)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-1.5 border-t border-white/5 pt-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        {user.mobile}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        {user.email || '-'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {formatDateTime(user.lastLoginAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                <Users2 className="h-7 w-7 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-300">No users found</p>
              <p className="text-xs text-slate-500">
                {search ? 'Try a different search term.' : 'Add your first user to get started.'}
              </p>
            </div>
          )}
        </section>

        {isModalOpen ? (
          <div
            className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={resetForm}
          >
            <div
              className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/40"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{editingId ? 'Edit User' : 'Add User'}</h2>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {editingId ? 'Update an existing account.' : 'Create a new owner account.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form className="grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-300">Name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Company or user name"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                      required
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-300">Mobile</span>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      name="mobile"
                      value={form.mobile}
                      onChange={handleMobileChange}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      pattern="\d{10}"
                      maxLength={10}
                      title="Mobile number must be exactly 10 digits"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                      required
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-300">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email address"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-300">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder={editingId ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-slate-300">State</span>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        placeholder="State"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                      />
                    </div>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-slate-300">District</span>
                    <input
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      placeholder="District"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-opacity hover:opacity-95 disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : null}
                  {isSubmitting ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {userToDelete ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={() => !isDeleting && setUserToDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-center shadow-2xl shadow-black/40"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Delete this user?</h3>
              <p className="mt-1.5 text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{userToDelete.name}</span> will be permanently removed. This
                action cannot be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <ToastContainer position="top-right" autoClose={3500} {...toastTheme} />
    </div>
  )
}

export default AdminPage
