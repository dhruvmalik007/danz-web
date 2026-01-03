import axios from 'axios'

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type Job = {
  job_id: string
  status: JobStatus
  progress: number
  message: string
  result?: {
    output_dir: string
    files: string[]
  }
  error?: string
  logs?: string[]
  created_at: string
  updated_at: string
}

export type DepthAnythingPrepareResponse = {
  job_id: string
  status: JobStatus
  message: string
}

export type DepthAnythingReconstructResponse = {
  job_id: string
  status: JobStatus
  progress: number
  message: string
  result?: {
    output_dir: string
    files: string[]
  }
  error?: string
  logs?: string[]
}

export type DepthAnythingReconstructOptions = {
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

export const depthAnythingApi = {
  async prepare(params: {
    images: File[]
    video?: File | null
    samplingFps?: number
    options?: DepthAnythingReconstructOptions
  }): Promise<DepthAnythingPrepareResponse> {
    const form = new FormData()

    for (const image of params.images) {
      form.append('images', image)
    }

    if (params.video) {
      form.append('video', params.video)
    }

    form.append('samplingFps', String(params.samplingFps ?? 10))
    form.append('showCam', String(params.options?.show_cam ?? true))
    form.append('filterBlackBg', String(params.options?.filter_black_bg ?? false))
    form.append('filterWhiteBg', String(params.options?.filter_white_bg ?? false))
    form.append('processResMethod', params.options?.process_res_method ?? 'low_res')
    form.append('savePercentage', String(params.options?.save_percentage ?? 10))
    form.append('numMaxPoints', String(params.options?.num_max_points ?? 1000))

    const { data } = await axios.post('/api/depth-anything/upload', form)
    return data
  },

  async reconstruct(params: {
    job_id: string
  }): Promise<DepthAnythingReconstructResponse> {
    const { data } = await axios.post('/api/depth-anything/reconstruct', {
      job_id: params.job_id,
    })
    return data
  },

  async getJobStatus(jobId: string): Promise<Job> {
    const { data } = await axios.get(`/api/da3/jobs/${jobId}`)
    return data
  },

  async clear(): Promise<void> {
    await axios.post('/api/depth-anything/clear', {})
  },
}
