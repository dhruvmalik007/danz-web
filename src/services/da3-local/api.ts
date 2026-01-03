import axios from 'axios'

const DA3_API_URL = process.env.NEXT_PUBLIC_DA3_API_URL || 'http://localhost:8001'

export type DA3JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type DA3Job = {
  job_id: string
  job_type: 'image' | 'video'
  status: DA3JobStatus
  progress: number
  message: string
  created_at: string
  updated_at: string
  options: {
    show_cam: boolean
    filter_black_bg: boolean
    filter_white_bg: boolean
    process_res_method: 'high_res' | 'low_res'
    save_percentage: number
    num_max_points: number
    infer_gs: boolean
    gs_trj_mode: 'smooth' | 'extend'
    gs_video_quality: 'low' | 'medium' | 'high'
  }
  logs: Array<{
    timestamp: string
    message: string
  }>
  result?: {
    model3d?: {
      path: string | null
      url: string | null
    }
    depthImage?: {
      path: string | null
      url: string | null
    }
    rgbImage?: {
      path: string | null
      url: string | null
    }
    frameCount?: number
  }
  error?: string
}

export type DA3JobListResponse = {
  jobs: DA3Job[]
}

export type DA3ReconstructOptions = {
  show_cam?: boolean
  filter_black_bg?: boolean
  filter_white_bg?: boolean
  process_res_method?: 'high_res' | 'low_res'
  save_percentage?: number
  num_max_points?: number
  infer_gs?: boolean
  gs_trj_mode?: 'smooth' | 'extend'
  gs_video_quality?: 'low' | 'medium' | 'high'
}

export const da3LocalApi = {
  async createJob(params: {
    images?: File[]
    video?: File | null
    jobType: 'image' | 'video'
    samplingFps?: number
    options?: DA3ReconstructOptions
  }): Promise<{ job_id: string; status: string; message: string }> {
    const formData = new FormData()

    if (params.images) {
      for (const image of params.images) {
        formData.append('images', image)
      }
    }

    if (params.video) {
      formData.append('video', params.video)
    }

    formData.append('job_type', params.jobType)
    formData.append('sampling_fps', String(params.samplingFps ?? 10))

    const options = params.options || {}
    formData.append('show_cam', String(options.show_cam ?? true))
    formData.append('filter_black_bg', String(options.filter_black_bg ?? false))
    formData.append('filter_white_bg', String(options.filter_white_bg ?? false))
    formData.append('process_res_method', options.process_res_method ?? 'low_res')
    formData.append('save_percentage', String(options.save_percentage ?? 10))
    formData.append('num_max_points', String(options.num_max_points ?? 1000))
    formData.append('infer_gs', String(options.infer_gs ?? false))
    formData.append('gs_trj_mode', options.gs_trj_mode ?? 'smooth')
    formData.append('gs_video_quality', options.gs_video_quality ?? 'low')

    const { data } = await axios.post(`${DA3_API_URL}/api/da3/jobs`, formData)
    return data
  },

  async getJob(jobId: string): Promise<DA3Job> {
    const { data } = await axios.get(`${DA3_API_URL}/api/da3/jobs/${jobId}`)
    return data
  },

  async listJobs(status?: DA3JobStatus): Promise<DA3JobListResponse> {
    const url = new URL(`${DA3_API_URL}/api/da3/jobs`)
    if (status) {
      url.searchParams.set('status', status)
    }
    const { data } = await axios.get(url.toString())
    return data
  },

  async deleteJob(jobId: string): Promise<{ message: string }> {
    const { data } = await axios.delete(`${DA3_API_URL}/api/da3/jobs/${jobId}`)
    return data
  },

  getOutputUrl(jobId: string, filename: string): string {
    return `${DA3_API_URL}/api/da3/jobs/${jobId}/outputs/${filename}`
  },

  streamJobLogs(
    jobId: string,
    onMessage: (job: DA3Job) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): () => void {
    const eventSource = new EventSource(
      `${DA3_API_URL}/api/da3/jobs/${jobId}/stream`
    )

    eventSource.onmessage = (event) => {
      try {
        const job = JSON.parse(event.data) as DA3Job
        onMessage(job)

        if (job.status === 'completed' || job.status === 'failed') {
          eventSource.close()
          onComplete()
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    eventSource.onerror = () => {
      onError('Connection to job stream lost')
      eventSource.close()
      onComplete()
    }

    // Return cleanup function
    return () => {
      eventSource.close()
    }
  },
}
