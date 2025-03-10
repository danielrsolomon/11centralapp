import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get auth cookie directly from the request
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Get the session cookie
    const sessionCookie = request.cookies.get('sb-auth-token')?.value
    const refreshCookie = request.cookies.get('sb-refresh-token')?.value
    
    if (!sessionCookie) {
      // No session cookie, return null user
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    // Make a direct request to Supabase auth API
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${sessionCookie}`,
        'APIKey': supabaseKey
      }
    })
    
    if (!response.ok) {
      console.error('Error fetching user from Supabase:', response.statusText)
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    const userData = await response.json()
    
    return NextResponse.json(
      { user: userData },
      { status: 200 }
    )
  } catch (error) {
    console.error('Exception in auth/user API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 