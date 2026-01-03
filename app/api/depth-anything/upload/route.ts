import { NextResponse } from 'next/server'

const DA3_LOCAL_API = process.env.DA3_API_URL || 'http://localhost:8001'

export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const images = form.getAll('images').filter(v => v instanceof File) as File[]
    const video = (form.get('video') instanceof File ? form.get('video') : null) as File | null
    const samplingFpsRaw = form.get('samplingFps')
    const showCamRaw = form.get('showCam')
    const filterBlackBgRaw = form.get('filterBlackBg')
    const filterWhiteBgRaw = form.get('filterWhiteBg')
    const processResMethodRaw = form.get('processResMethod')
    const savePercentageRaw = form.get('savePercentage')
    const numMaxPointsRaw = form.get('numMaxPoints')

    const samplingFps = samplingFpsRaw ? Number(samplingFpsRaw) : 10
    const showCam = showCamRaw ? showCamRaw === 'true' : true
    const filterBlackBg = filterBlackBgRaw ? filterBlackBgRaw === 'true' : false
    const filterWhiteBg = filterWhiteBgRaw ? filterWhiteBgRaw === 'true' : false
    const processResMethod = (processResMethodRaw as 'high_res' | 'low_res') || 'low_res'
    const savePercentage = savePercentageRaw ? Number(savePercentageRaw) : 10
    const numMaxPoints = numMaxPointsRaw ? Number(numMaxPointsRaw) : 1000

    if (images.length === 0 && !video) {
      return NextResponse.json({ error: 'No images or video provided' }, { status: 400 })
    }

    // Create FormData for the local DA3 API
    const da3Form = new FormData()

    // Determine job type
    const jobType = video ? 'video' : 'image'

    da3Form.append('job_type', jobType)
    da3Form.append('sampling_fps', String(samplingFps))
    da3Form.append('show_cam', String(showCam))
    da3Form.append('filter_black_bg', String(filterBlackBg))
    da3Form.append('filter_white_bg', String(filterWhiteBg))
    da3Form.append('process_res_method', processResMethod)
    da3Form.append('save_percentage', String(savePercentage))
    da3Form.append('num_max_points', String(numMaxPoints))
    da3Form.append('infer_gs', 'false')
    da3Form.append('gs_trj_mode', 'smooth')
    da3Form.append('gs_video_quality', 'low')

    // Add files
    if (jobType === 'image') {
      images.forEach(img => da3Form.append('images', img))
    } else {
      da3Form.append('video', video!)
    }

    // Call local DA3 API
    const response = await fetch(`${DA3_LOCAL_API}/api/da3/jobs`, {
      method: 'POST',
      body: da3Form,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`DA3 API failed: ${response.status} ${text}`)
    }

    const result = await response.json()

    // Return job info for tracking
    return NextResponse.json({
      job_id: result.job_id,
      status: result.status,
      message: result.message,
    })
  } catch (err: any) {
    console.error('Depth-Anything upload route failed:', err)
    return NextResponse.json(
      {
        error: err?.message || 'Upload failed',
      },
      { status: 500 },
    )
  }
}
