import { NextResponse } from 'next/server'

const DA3_API_URL = process.env.DA3_API_URL || 'http://localhost:8001'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string; filename: string }> }
) {
  try {
    const { jobId, filename } = await params
    const response = await fetch(
      `${DA3_API_URL}/api/da3/jobs/${jobId}/outputs/${filename}`
    )

    if (!response.ok) {
      throw new Error(`Failed to download output: ${response.status}`)
    }

    // Return the file as-is
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Failed to download DA3 output:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to download output' },
      { status: 500 }
    )
  }
}
