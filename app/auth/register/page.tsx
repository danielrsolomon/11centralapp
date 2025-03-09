import { RegistrationForm } from '@/components/auth/registration-form'
import Link from 'next/link'

export const metadata = {
  title: 'Register - E11EVEN Central',
  description: 'Create a new E11EVEN Central account',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center">
            <span className="text-yellow-500">E11EVEN</span>
            <span className="ml-1">Central</span>
          </h1>
          <p className="text-gray-400 mt-2">Create a new account to access E11EVEN Central</p>
        </div>
        
        <RegistrationForm />
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-yellow-500 hover:text-yellow-400">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 