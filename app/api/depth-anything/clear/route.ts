import { NextResponse } from 'next/server'

const DA3_LOCAL_API = process.env.DA3_API_URL || 'http://localhost:8001'

export async function POST() {
  try {
    // List all jobs
    const response = await fetch(`${DA3_LOCAL_API}/api/da3/jobs`)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`List jobs failed: ${response.status} ${text}`)
    }

    const data = await response.json()

    // Delete all jobs
    const deletePromises = data.jobs.map((job: any) =>
      fetch(`${DA3_LOCAL_API}/api/da3/jobs/${job.job_id}`, {
        method: 'DELETE',
      })
    )

    await Promise.all(deletePromises)

    return NextResponse.json({ success: true, deleted: data.jobs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Clear failed' }, { status: 500 })
  }
}
