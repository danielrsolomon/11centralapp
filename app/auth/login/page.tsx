import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'

export const metadata = {
  title: 'Sign In - E11EVEN Central',
  description: 'Sign in to your E11EVEN Central account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center">
            <span className="text-yellow-500">E11EVEN</span>
            <span className="ml-1">Central</span>
          </h1>
          <p className="text-gray-400 mt-2">Enter your credentials to access your account</p>
        </div>
        
        <LoginForm />
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-yellow-500 hover:text-yellow-400">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 