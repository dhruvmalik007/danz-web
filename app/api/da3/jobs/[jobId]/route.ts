import { NextResponse } from 'next/server'

const DA3_API_URL = process.env.DA3_API_URL || 'http://localhost:8001'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const response = await fetch(`${DA3_API_URL}/api/da3/jobs/${jobId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to fetch DA3 job:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const response = await fetch(`${DA3_API_URL}/api/da3/jobs/${jobId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete job: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to delete DA3 job:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete job' },
      { status: 500 }
    )
  }
}
