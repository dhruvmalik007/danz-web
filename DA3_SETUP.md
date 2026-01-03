# DA3-SMALL Integration Setup Guide

This guide walks you through setting up the local DA3-SMALL FastAPI server and integrating it with the Next.js application.

## Prerequisites

- Docker and Docker Compose
- NVIDIA GPU with nvidia-docker support (recommended)
- At least 8GB GPU memory
- Node.js 18+ and pnpm

## Quick Start

### 1. Environment Configuration

Copy the DA3 environment example file:

```bash
cp .env.da3.example .env.da3
```

Edit `.env.da3` if needed (default values should work for most setups):

```env
DA3_API_URL=http://localhost:8001
NEXT_PUBLIC_DA3_API_URL=http://localhost:8001
CUDA_VISIBLE_DEVICES=0
```

### 2. Build and Start the DA3 Service

```bash
# Build the Docker image
pnpm run da3:build

# Start the service
pnpm run da3:up

# View logs to verify it's running
pnpm run da3:logs
```

The service will be available at `http://localhost:8001`

### 3. Start the Next.js Application

```bash
# In a new terminal
pnpm run dev
```

### 4. Access the Dashboard

Navigate to `http://localhost:3000/da3-local` to access the local DA3 dashboard.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (Port 3000)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /da3-local Page                                     │  │
│  │  └─> DepthAnythingDashboardLocal Component          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/da3/jobs/* Routes                             │  │
│  │  └─> Proxy to FastAPI Server                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌─────────────────────────────────────────────────────────────┐
│           FastAPI Server (Port 8001) - Docker               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/da3/jobs (Create Job)                    │  │
│  │  GET  /api/da3/jobs/{id} (Get Status)               │  │
│  │  GET  /api/da3/jobs/{id}/stream (SSE Logs)          │  │
│  │  GET  /api/da3/jobs/{id}/outputs/{file} (Download)  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Tasks                                   │  │
│  │  └─> process_image_job()                           │  │
│  │  └─> process_video_job()                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DA3-SMALL Model                                    │  │
│  │  └─> depth-anything-3 CLI                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Available Scripts

### DA3 Service Management

```bash
# Build the Docker image
pnpm run da3:build

# Start the service
pnpm run da3:up

# Stop the service
pnpm run da3:down

# View logs
pnpm run da3:logs

# Restart the service
pnpm run da3:restart

# Access container shell
pnpm run da3:shell
```

### Development

```bash
# Start Next.js dev server
pnpm run dev

# Start Next.js with Turbopack
pnpm run dev:turbo

# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format
```

## File Structure

```
danz-web/
├── app/
│   ├── da3-local/
│   │   └── page.tsx                    # Local DA3 dashboard page
│   ├── api/
│   │   └── da3/
│   │       └── jobs/
│   │           ├── route.ts            # Create/list jobs
│   │           ├── [jobId]/
│   │           │   ├── route.ts        # Get/delete job
│   │           │   ├── stream/
│   │           │   │   └── route.ts    # SSE log streaming
│   │           │   └── outputs/
│   │           │       └── [filename]/
│   │           │           └── route.ts # Download outputs
│   └── da3-fastapi-setup/
│       ├── Dockerfile                  # Docker image config
│       ├── docker-compose.yml          # Service orchestration
│       ├── requirements.txt            # Python dependencies
│       ├── main.py                     # FastAPI application
│       ├── uploads/                    # Uploaded files (volume)
│       ├── outputs/                    # Generated outputs (volume)
│       └── jobs/                       # Job data (volume)
├── src/
│   ├── components/
│   │   └── dashboard/
│   │       └── DepthAnythingDashboardLocal.tsx  # React component
│   └── services/
│       └── da3-local/
│           └── api.ts                  # TypeScript API client
├── .env.da3.example                    # Environment template
├── .env.da3                            # Your environment config
└── package.json                        # Scripts and dependencies
```

## Usage Examples

### Processing Images

```typescript
import { da3LocalApi } from '@/src/services/da3-local/api'

const result = await da3LocalApi.createJob({
  images: [imageFile1, imageFile2],
  jobType: 'image',
  samplingFps: 10,
  options: {
    show_cam: true,
    process_res_method: 'low_res',
    num_max_points: 1000,
  }
})

// Stream logs
da3LocalApi.streamJobLogs(
  result.job_id,
  (job) => {
    console.log(`Progress: ${Math.round(job.progress * 100)}%`)
    console.log(`Status: ${job.status}`)
  },
  (error) => console.error(error),
  () => console.log('Complete!')
)
```

### Processing Video

```typescript
const result = await da3LocalApi.createJob({
  video: videoFile,
  jobType: 'video',
  samplingFps: 5,  // Extract 5 frames per second
  options: {
    show_cam: true,
    process_res_method: 'low_res',
  }
})
```

### Downloading Results

```typescript
// Get job status
const job = await da3LocalApi.getJob(jobId)

if (job.status === 'completed' && job.result?.model3d?.url) {
  // Download 3D model
  window.open(job.result.model3d.url, '_blank')
  
  // Or download programmatically
  const response = await fetch(job.result.model3d.url)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'model.glb'
  a.click()
}
```

## Troubleshooting

### Service Won't Start

1. Check if port 8001 is already in use:
```bash
lsof -i :8001
```

2. Check Docker logs:
```bash
pnpm run da3:logs
```

3. Verify Docker has GPU access:
```bash
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

### Jobs Fail Immediately

1. Check the service is running:
```bash
curl http://localhost:8001/health
```

2. Check job logs in the dashboard
3. Verify uploads directory has write permissions:
```bash
ls -la app/da3-fastapi-setup/uploads
```

### Out of Memory Errors

1. Reduce `num_max_points` in options (try 500 instead of 1000)
2. Use `process_res_method: "low_res"`
3. Process fewer images at once
4. Check GPU memory usage:
```bash
nvidia-smi
```

### Slow Performance

1. Verify GPU is being used:
```bash
pnpm run da3:shell
# Inside container
nvidia-smi
```

2. Reduce `sampling_fps` for videos
3. Use lower resolution images

## Production Deployment

### Using Docker Compose

The `docker-compose.yml` is configured for production use with:

- Automatic restart on failure
- GPU resource reservation
- Volume persistence for uploads and outputs

### Environment Variables

Set these in your production environment:

```env
DA3_API_URL=https://your-domain.com
NEXT_PUBLIC_DA3_API_URL=https://your-domain.com
CUDA_VISIBLE_DEVICES=0
```

### Scaling

For higher throughput:

1. Run multiple instances with different ports
2. Use a load balancer (nginx, traefik)
3. Consider using a job queue (Redis, RabbitMQ)

## Monitoring

### Health Check

```bash
curl http://localhost:8001/health
```

### View Active Jobs

```bash
curl http://localhost:8001/api/da3/jobs
```

### View Service Stats

```bash
docker stats da3-fastapi
```

## Next Steps

1. Test the integration with sample images/videos
2. Configure options for your specific use case
3. Set up monitoring and alerts
4. Implement error handling in your application
5. Consider adding authentication for the API

## Support

For issues with:
- **DA3 Model**: Check the [Depth Anything 3 GitHub](https://github.com/ByteDance-Seed/depth-anything-3)
- **FastAPI Server**: Check logs with `pnpm run da3:logs`
- **Next.js Integration**: Check browser console and network tab
