# DA3-SMALL Local FastAPI Server

This directory contains a Dockerized FastAPI server that runs the Depth Anything 3 (DA3-SMALL) model locally for depth estimation and point cloud reconstruction.

## Features

- **Image Processing**: Upload multiple images for depth estimation and 3D reconstruction
- **Video Processing**: Upload videos with configurable FPS sampling for frame extraction
- **Job Management**: Create, monitor, and manage processing jobs with real-time log streaming
- **Point Cloud Generation**: Export results as GLB files with depth and RGB outputs
- **Docker Support**: Fully containerized with GPU support

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) NVIDIA GPU with nvidia-docker support for GPU acceleration
- At least 4GB RAM (8GB recommended)

### Installation

1. Build and start the Docker container:

```bash
cd app/da3-fastapi-setup
docker-compose up -d --build
```

2. Verify the service is running:

```bash
curl http://localhost:8001/health
```

3. Check the API documentation:

```bash
open http://localhost:8001/docs
```

**Note for macOS Users:**
- The service will run in CPU-only mode on macOS
- GPU acceleration is only available on Linux with NVIDIA GPUs
- Processing will be slower but fully functional

## API Endpoints

### Create Job
```
POST /api/da3/jobs
```

Upload images or video and create a new processing job.

**Parameters:**
- `images`: (optional) List of image files
- `video`: (optional) Video file
- `job_type`: "image" or "video"
- `sampling_fps`: (optional) FPS for video frame extraction (default: 10.0)
- `show_cam`: (optional) Show camera in output (default: true)
- `filter_black_bg`: (optional) Filter black background (default: false)
- `filter_white_bg`: (optional) Filter white background (default: false)
- `process_res_method`: (optional) "high_res" or "low_res" (default: "low_res")
- `save_percentage`: (optional) Save percentage (default: 10)
- `num_max_points`: (optional) Maximum number of points (default: 1000)

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "Job created successfully"
}
```

### Get Job Status
```
GET /api/da3/jobs/{job_id}
```

Get the current status and progress of a job.

### Stream Job Logs
```
GET /api/da3/jobs/{job_id}/stream
```

Stream real-time logs and status updates using Server-Sent Events (SSE).

### List Jobs
```
GET /api/da3/jobs?status={status}
```

List all jobs, optionally filtered by status.

### Download Output
```
GET /api/da3/jobs/{job_id}/outputs/{filename}
```

Download output files (GLB, PNG, etc.) from a completed job.

### Delete Job
```
DELETE /api/da3/jobs/{job_id}
```

Delete a job and all associated files.

## Environment Variables

- `CUDA_VISIBLE_DEVICES`: GPU device to use (default: 0)
- `DA3_API_URL`: API URL for Next.js integration (default: http://localhost:8001)

## Directory Structure

```
da3-fastapi-setup/
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── requirements.txt        # Python dependencies
├── main.py                # FastAPI application
├── uploads/               # Uploaded files (volume)
├── outputs/               # Generated outputs (volume)
└── jobs/                  # Job data and logs (volume)
```

## Integration with Next.js

The FastAPI server is integrated with the Next.js app through:

1. **API Routes**: `/app/api/da3/jobs/*` routes proxy requests to the FastAPI server
2. **Service Layer**: `/src/services/da3-local/api.ts` provides TypeScript client
3. **Dashboard**: `/src/components/dashboard/DepthAnythingDashboardLocal.tsx` React component

### Environment Configuration

Add to your `.env` file:

```env
DA3_API_URL=http://localhost:8001
NEXT_PUBLIC_DA3_API_URL=http://localhost:8001
```

## Usage Example

### Using the Dashboard

Navigate to `/da3-local` in your browser to access the local DA3 dashboard.

### Using the API Directly

```typescript
import { da3LocalApi } from '@/src/services/da3-local/api'

// Create a job
const result = await da3LocalApi.createJob({
  images: [file1, file2],
  jobType: 'image',
  samplingFps: 10,
  options: {
    show_cam: true,
    process_res_method: 'low_res',
  }
})

// Stream logs
await da3LocalApi.streamJobLogs(
  result.job_id,
  (job) => console.log('Progress:', job.progress),
  (error) => console.error('Error:', error),
  () => console.log('Complete!')
)
```

## Troubleshooting

### GPU Not Detected

If you see "CUDA not available" errors:

1. Verify nvidia-docker is installed:
```bash
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

2. Check GPU availability in the container:
```bash
docker exec da3-fastapi nvidia-smi
```

### Out of Memory

If you encounter OOM errors:

1. Reduce `num_max_points` in the options
2. Use `process_res_method: "low_res"`
3. Process fewer images at once

### Slow Performance

For better performance:

1. Use GPU instead of CPU
2. Reduce image resolution
3. Lower `sampling_fps` for videos

## Development

### Running Locally (without Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Install depth-anything-3
git clone https://github.com/ByteDance-Seed/depth-anything-3
cd depth-anything-3
pip install -e .

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Adding New Features

1. Update `main.py` with new endpoints
2. Update TypeScript types in `src/services/da3-local/api.ts`
3. Update the dashboard component as needed
4. Rebuild the Docker image

## License

This project uses the Depth Anything 3 model, which is licensed under Apache 2.0.
