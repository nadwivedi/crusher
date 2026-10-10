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
  UserCheck,
  UserPlus,
  UserX,
  LogIn,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import StatCard from '../components/StatCard'

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
  planType: 'yearly',
  planPrice: '',
}

const PLAN_OPTIONS = [
  { value: 'yearly', label: 'Yearly', hint: 'Paid every year' },
  { value: 'lifetime', label: 'Lifetime', hint: 'One-time payment' },
]

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

// "Yearly · ₹12,000/yr" or "Lifetime · ₹50,000"
const describePlan = (user) => {
  const price = Number(user?.planPrice || 0)
  if (user?.planType === 'lifetime') return `Lifetime${price > 0 ? ` · ${formatRupees(price)}` : ''}`
  return `Yearly${price > 0 ? ` · ${formatRupees(price)}/yr` : ''}`
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

// "5 min ago", "3 hours ago", "2 days ago"; older than a month shows the date
const formatTimeAgo = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (Number.isNaN(seconds)) return ''
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDateTime(value)
}

// Sign-in and activity cell: how long ago on top, the exact time under it
const renderWhen = (value, emptyLabel) => (value
  ? (
    <>
      <span className="block font-medium text-stone-800">{formatTimeAgo(value)}</span>
      <span className="block text-[11px] text-stone-400">{formatDateTime(value)}</span>
    </>
  )
  : <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">{emptyLabel}</span>)

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '')
  return initials.join('') || '?'
}

const AVATAR_PALETTE = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
]

const DAY_MS = 24 * 60 * 60 * 1000

// Light inputs and buttons shared by the dashboard and its popups
const INPUT_CLASS = 'w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-stone-500 focus:ring-4 focus:ring-stone-200'
const PRIMARY_BUTTON = 'flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60'
const SECONDARY_BUTTON = 'flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-60'
const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800'

const getAvatarClass = (seed) => {
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

  // Opens the crusher app signed in as this user, in a new tab. The tab opens first so pop-up blockers allow it.
  const handleAccess = async (user) => {
    const appTab = window.open('', '_blank')
    try {
      const response = await axios.post(`${USERS_ENDPOINT}/${user.id}/access`, {}, { withCredentials: true })
      const url = response.data?.data?.url
      if (!url) throw new Error('No access link')
      if (appTab) {
        appTab.opener = null
        appTab.location.href = url
      } else {
        window.location.href = url
      }
    } catch (requestError) {
      appTab?.close()
      toast.error(requestError.response?.data?.message || 'Could not open this account')
    }
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
      planType: user.planType === 'lifetime' ? 'lifetime' : 'yearly',
      planPrice: Number(user.planPrice || 0) > 0 ? String(user.planPrice) : '',
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
        planType: form.planType,
        planPrice: Number(form.planPrice || 0),
      }

      if (!(payload.planPrice > 0)) {
        toast.error(`Enter the ${form.planType === 'lifetime' ? 'lifetime' : 'yearly'} price`)
        setIsSubmitting(false)
        return
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

  // Sign-in screens: plain off-white, light inputs, one dark button
  const loginInputClass = 'w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-stone-500 focus:ring-4 focus:ring-stone-200'

  if (isCheckingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f4f0] p-6" style={{ colorScheme: 'light' }}>
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="h-7 w-7 animate-spin text-stone-700" />
          <p className="text-sm font-medium">Checking admin access…</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f4f0] px-4 py-10" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 shadow-sm">
              <Mountain className="h-6 w-6 text-white" strokeWidth={2.25} />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-stone-900">Crusher Admin</h1>
            <p className="mt-1 text-sm text-stone-500">Sign in to manage users</p>
          </div>

          <form
            className="grid gap-4 rounded-2xl border border-stone-200 bg-[#fbfaf7] p-6 shadow-sm"
            onSubmit={handleAdminLogin}
          >
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  name="email"
                  type="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  placeholder="admin@example.com"
                  autoComplete="username"
                  className={loginInputClass}
                  autoFocus
                  required
                />
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-stone-700">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className={`${loginInputClass} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:text-stone-700"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoggingIn ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-stone-400">Admin access only</p>
        </div>

        <ToastContainer position="top-right" autoClose={3500} theme="light" />
      </div>
    )
  }

  // Summary for the stat cards: who has signed in lately, who is new, who never signed in
  const now = Date.now()
  const activeThisWeek = users.filter((user) => {
    const lastSeen = user.lastActivityAt || user.lastLoginAt
    return lastSeen && now - new Date(lastSeen).getTime() <= 7 * DAY_MS
  }).length
  const neverSignedIn = users.filter((user) => !user.lastLoginAt).length
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const newThisMonth = users.filter((user) => user.createdAt && new Date(user.createdAt).getTime() >= monthStart).length

  const renderFieldLabel = (text) => <span className="text-sm font-medium text-stone-700">{text}</span>

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f4f0] lg:flex-row" style={{ colorScheme: 'light' }}>
      <Sidebar userCount={users.length} adminEmail={admin.email} onLogout={handleAdminLogout} />

      <main className="min-w-0 flex-1 space-y-4 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Users</h1>
            <p className="mt-0.5 text-sm text-stone-500">Owner accounts of the crusher app: add, edit and see when they last signed in</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openCreateModal} className={PRIMARY_BUTTON}>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add User
            </button>
            <button type="button" onClick={handleAdminLogout} className={`${SECONDARY_BUTTON} lg:hidden`}>
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4">
          <StatCard compact icon={Users2} tone="indigo" label="Total Users" value={String(users.length)} hint={`${users.filter((user) => user.planType === 'lifetime').length} lifetime · ${users.filter((user) => user.planType !== 'lifetime').length} yearly`} />
          <StatCard compact icon={UserCheck} tone="emerald" label="Active This Week" value={String(activeThisWeek)} hint="Used the app in the last 7 days" />
          <StatCard compact icon={UserPlus} tone="blue" label="New This Month" value={String(newThisMonth)} hint="Accounts added this month" />
          <StatCard compact icon={UserX} tone="amber" label="Never Signed In" value={String(neverSignedIn)} hint="Have not used the app yet" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fbfaf7] shadow-xs">
          <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <h2 className="text-sm font-bold text-stone-800">
              All Users
              <span className="ml-2 text-xs font-normal text-stone-500">{filteredUsers.length} shown</span>
            </h2>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                placeholder="Search name, mobile, email, place"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-stone-500">
              <Loader2 className="h-6 w-6 animate-spin text-stone-700" />
              <p className="text-sm">Loading users…</p>
            </div>
          ) : filteredUsers.length ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1040px] text-left">
                  <thead>
                    <tr className="bg-stone-100/70 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      <th className="px-5 py-2.5">User</th>
                      <th className="px-3 py-2.5">Mobile</th>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Plan</th>
                      <th className="px-3 py-2.5">Location</th>
                      <th className="px-3 py-2.5">Last Sign In</th>
                      <th className="px-3 py-2.5">Last Activity</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-stone-200 text-sm text-stone-700 transition hover:bg-white">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarClass(user.name || user.id)}`}>
                              {getInitials(user.name)}
                            </span>
                            <span className="font-semibold text-stone-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{user.mobile}</td>
                        <td className="px-3 py-2.5">{user.email || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${user.planType === 'lifetime' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-sky-50 text-sky-700 ring-sky-200'}`}>
                            {describePlan(user)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{[user.district, user.state].filter(Boolean).join(', ') || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{renderWhen(user.lastLoginAt, 'Never')}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{renderWhen(user.lastActivityAt, 'No activity')}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleAccess(user)}
                              className="mr-1 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              title={`Open the app as ${user.name}`}
                            >
                              <LogIn className="h-3.5 w-3.5" />
                              Access
                            </button>
                            <button type="button" onClick={() => handleEdit(user)} className={`${ICON_BUTTON} hover:text-blue-700`} title="Edit" aria-label={`Edit ${user.name}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setUserToDelete(user)} className={`${ICON_BUTTON} hover:bg-rose-50 hover:text-rose-700`} title="Delete" aria-label={`Delete ${user.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone and tablet: short rows */}
              <ul className="divide-y divide-stone-200 lg:hidden">
                {filteredUsers.map((user) => (
                  <li key={user.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarClass(user.name || user.id)}`}>
                      {getInitials(user.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {user.name}
                        <span className={`ml-2 text-[11px] font-semibold ${user.planType === 'lifetime' ? 'text-violet-700' : 'text-sky-700'}`}>{describePlan(user)}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{user.mobile}</span>
                        {user.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{user.email}</span>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-stone-400">
                        <span className="inline-flex items-center gap-1" title={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined}>
                          <Clock className="h-3 w-3" />Signed in {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : 'never'}
                        </span>
                        <span className="inline-flex items-center gap-1" title={user.lastActivityAt ? formatDateTime(user.lastActivityAt) : undefined}>
                          Active {user.lastActivityAt ? formatTimeAgo(user.lastActivityAt) : 'never'}
                        </span>
                        {[user.district, user.state].filter(Boolean).length > 0 && (
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[user.district, user.state].filter(Boolean).join(', ')}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button type="button" onClick={() => handleAccess(user)} className={`${ICON_BUTTON} text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700`} aria-label={`Open the app as ${user.name}`}>
                        <LogIn className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleEdit(user)} className={ICON_BUTTON} aria-label={`Edit ${user.name}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setUserToDelete(user)} className={`${ICON_BUTTON} hover:bg-rose-50 hover:text-rose-700`} aria-label={`Delete ${user.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100">
                <Users2 className="h-5 w-5 text-stone-400" />
              </span>
              <p className="text-sm font-semibold text-stone-800">No users found</p>
              <p className="text-xs text-stone-500">{search ? 'Try a different search.' : 'Add the first user to get started.'}</p>
            </div>
          )}
        </section>

        {isModalOpen ? (
          <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={resetForm}>
            <div
              className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-[#fbfaf7] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-stone-900">{editingId ? 'Edit User' : 'Add User'}</h2>
                  <p className="mt-0.5 text-sm text-stone-500">{editingId ? 'Update this account.' : 'Create a new owner account.'}</p>
                </div>
                <button type="button" onClick={resetForm} className={ICON_BUTTON} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
                <label className="grid gap-1.5">
                  {renderFieldLabel('Name')}
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Company or user name" className={INPUT_CLASS} autoFocus required />
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    {renderFieldLabel('Mobile')}
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <input
                        name="mobile"
                        value={form.mobile}
                        onChange={handleMobileChange}
                        placeholder="10-digit mobile"
                        inputMode="numeric"
                        pattern="\d{10}"
                        maxLength={10}
                        title="Mobile number must be exactly 10 digits"
                        className={INPUT_CLASS}
                        required
                      />
                    </div>
                  </label>

                  <label className="grid gap-1.5">
                    {renderFieldLabel('Email')}
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Optional" className={INPUT_CLASS} />
                    </div>
                  </label>
                </div>

                <label className="grid gap-1.5">
                  {renderFieldLabel('Password')}
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder={editingId ? 'Leave blank to keep the current password' : 'At least 6 characters'}
                      className={`${INPUT_CLASS} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:text-stone-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="grid gap-1.5">
                    {renderFieldLabel('State')}
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <input name="state" value={form.state} onChange={handleChange} placeholder="State" className={INPUT_CLASS} />
                    </div>
                  </label>
                  <label className="grid gap-1.5">
                    {renderFieldLabel('District')}
                    <input name="district" value={form.district} onChange={handleChange} placeholder="District" className={`${INPUT_CLASS} pl-3`} />
                  </label>
                </div>

                <div className="grid gap-1.5">
                  {renderFieldLabel('Plan')}
                  <div className="grid grid-cols-2 gap-2">
                    {PLAN_OPTIONS.map((option) => {
                      const active = form.planType === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, planType: option.value }))}
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-2 text-left transition ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'}`}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className={`block text-[11px] ${active ? 'text-white/80' : 'text-stone-400'}`}>{option.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <label className="grid gap-1.5">
                  {renderFieldLabel(form.planType === 'lifetime' ? 'Lifetime Price (one-time)' : 'Yearly Price (per year)')}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">₹</span>
                    <input
                      name="planPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.planPrice}
                      onChange={handleChange}
                      placeholder={form.planType === 'lifetime' ? 'e.g. 50000' : 'e.g. 12000'}
                      className={`${INPUT_CLASS} pl-7 ${form.planType === 'yearly' ? 'pr-16' : ''}`}
                      required
                    />
                    {form.planType === 'yearly' && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">/ year</span>
                    )}
                  </div>
                </label>

                <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
                  <button type="button" onClick={resetForm} className={SECONDARY_BUTTON}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} className={`${PRIMARY_BUTTON} px-6`}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isSubmitting ? 'Saving…' : editingId ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {userToDelete ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !isDeleting && setUserToDelete(null)}>
            <div
              className="w-full max-w-sm rounded-2xl border border-stone-200 bg-[#fbfaf7] p-6 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </span>
              <h3 className="mt-3 text-base font-bold text-stone-900">Delete this user?</h3>
              <p className="mt-1 text-sm text-stone-500">
                <span className="font-semibold text-stone-800">{userToDelete.name}</span> will be removed for good. This cannot be undone.
              </p>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setUserToDelete(null)} disabled={isDeleting} className={`${SECONDARY_BUTTON} flex-1`}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <ToastContainer position="top-right" autoClose={3500} theme="light" />
    </div>
  )
}

export default AdminPage
