import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/context/authStore'
import { Input, Button } from '@/components/ui'

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
const regSchema = z.object({
  full_name: z.string().min(2), email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Needs uppercase').regex(/\d/, 'Needs a digit'),
  business_name: z.string().min(2), whatsapp_number: z.string().optional(),
})

function Shell({ children, title, sub }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-bg"
               style={{ background: 'linear-gradient(135deg,#f5a623,#e8830a)' }}>S</div>
          <div>
            <div className="text-base font-bold text-[#dde3f0]">SME Growth AI</div>
            <div className="text-[10px] text-muted">by Qlambda Technologies LLP</div>
          </div>
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-bold text-[#dde3f0] mb-1">{title}</h1>
          <p className="text-sm text-muted mb-6">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) })
  const onSubmit = async d => {
    try { await login(d.email, d.password); toast.success('Welcome back!'); navigate('/') }
    catch (e) { toast.error(e.response?.data?.detail || 'Login failed') }
  }
  return (
    <Shell title="Welcome back 🙏" sub="Sign in to your SME Growth AI dashboard">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" type="email" placeholder="you@business.com" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" placeholder="Your password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" className="w-full py-2.5 mt-2" loading={isSubmitting}>Sign in</Button>
      </form>
      <p className="text-center text-sm text-muted mt-4">
        No account? <Link to="/register" className="text-accent hover:underline font-medium">Create one free</Link>
      </p>
    </Shell>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: reg } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(regSchema) })
  const onSubmit = async d => {
    try { await reg(d); toast.success('Account created! 🎉'); navigate('/') }
    catch (e) { toast.error(e.response?.data?.detail || 'Registration failed') }
  }
  return (
    <Shell title="Start for free 🚀" sub="Set up your AI-powered WhatsApp assistant in minutes">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Your full name"   placeholder="Jai Sharma"          error={errors.full_name?.message}     {...register('full_name')} />
        <Input label="Business name"   placeholder="Jai's Unisex Salon"   error={errors.business_name?.message} {...register('business_name')} />
        <Input label="Email"           type="email" placeholder="jai@salon.in" error={errors.email?.message}   {...register('email')} />
        <Input label="WhatsApp number" placeholder="+91 98765 43210"                                            {...register('whatsapp_number')} />
        <Input label="Password"        type="password" placeholder="Min 8 chars, 1 uppercase, 1 digit" error={errors.password?.message} {...register('password')} />
        <Button type="submit" className="w-full py-2.5 mt-2" loading={isSubmitting}>Create free account</Button>
      </form>
      <p className="text-center text-sm text-muted mt-4">
        Already registered? <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
      </p>
    </Shell>
  )
}
