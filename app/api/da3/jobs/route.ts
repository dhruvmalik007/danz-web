import { NextResponse } from 'next/server'

const DA3_API_URL = process.env.DA3_API_URL || 'http://localhost:8001'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    
    // Forward the request to the DA3 FastAPI server
    const response = await fetch(`${DA3_API_URL}/api/da3/jobs`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DA3 API error: ${response.status} ${errorText}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to create DA3 job:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create job' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    
    const url = new URL(`${DA3_API_URL}/api/da3/jobs`)
    if (status) {
      url.searchParams.set('status', status)
    }
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to fetch DA3 jobs:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
