import { NextResponse } from 'next/server'

const DA3_API_URL = process.env.DA3_API_URL || 'http://localhost:8001'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const response = await fetch(`${DA3_API_URL}/api/da3/jobs/${jobId}/stream`)

    if (!response.ok) {
      throw new Error(`Failed to stream job: ${response.status}`)
    }

    // Return the stream as-is
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Failed to stream DA3 job:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to stream job' },
      { status: 500 }
    )
  }
}
