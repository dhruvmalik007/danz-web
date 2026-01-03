import { NextResponse } from 'next/server'

const DA3_LOCAL_API = process.env.DA3_API_URL || 'http://localhost:8001'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      job_id: string
    }

    if (!body.job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    // Get job status from local DA3 API
    const response = await fetch(`${DA3_LOCAL_API}/api/da3/jobs/${body.job_id}`)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Get job failed: ${response.status} ${text}`)
    }

    const job = await response.json()

    // Return job status and results
    return NextResponse.json({
      job_id: job.job_id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      result: job.result,
      error: job.error,
      logs: job.logs,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Get job failed' }, { status: 500 })
  }
}
