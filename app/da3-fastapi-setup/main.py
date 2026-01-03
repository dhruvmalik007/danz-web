from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal, Tuple
import os
import uuid
import json
import asyncio
import subprocess
import shutil
from pathlib import Path
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DA3-SMALL Depth Estimation API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
UPLOAD_DIR = Path("/app/uploads")
OUTPUT_DIR = Path("/app/outputs")
JOBS_DIR = Path("/app/jobs")

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Job status types
JobStatus = Literal["pending", "processing", "completed", "failed"]

# Models
class JobCreateRequest(BaseModel):
    job_type: Literal["image", "video"]
    sampling_fps: Optional[float] = 10.0
    options: Optional[dict] = None

class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float
    message: str
    created_at: str
    updated_at: str
    result: Optional[dict] = None
    error: Optional[str] = None

class ReconstructOptions(BaseModel):
    show_cam: bool = True
    filter_black_bg: bool = False
    filter_white_bg: bool = False
    process_res_method: Literal["high_res", "low_res"] = "low_res"
    save_percentage: int = 10
    num_max_points: int = 1000
    infer_gs: bool = False
    gs_trj_mode: Literal["smooth", "extend"] = "smooth"
    gs_video_quality: Literal["low", "medium", "high"] = "low"

# In-memory job storage (in production, use a database)
jobs: dict[str, dict] = {}

def get_job_path(job_id: str) -> Path:
    return JOBS_DIR / job_id

def get_job_file(job_id: str) -> Path:
    return get_job_path(job_id) / "job.json"

def save_job(job_id: str, job_data: dict):
    job_file = get_job_file(job_id)
    job_file.parent.mkdir(parents=True, exist_ok=True)
    with open(job_file, 'w') as f:
        json.dump(job_data, f, indent=2)

def load_job(job_id: str) -> Optional[dict]:
    job_file = get_job_file(job_id)
    if not job_file.exists():
        return None
    with open(job_file, 'r') as f:
        return json.load(f)

def update_job_status(job_id: str, status: JobStatus, progress: float = 0.0, message: str = "", result: Optional[dict] = None, error: Optional[str] = None):
    job = load_job(job_id)
    if job:
        job["status"] = status
        job["progress"] = progress
        job["message"] = message
        job["updated_at"] = datetime.now().isoformat()
        if result is not None:
            job["result"] = result
        if error is not None:
            job["error"] = error
        save_job(job_id, job)

def append_job_log(job_id: str, log_message: str):
    job = load_job(job_id)
    if job:
        if "logs" not in job:
            job["logs"] = []
        job["logs"].append({
            "timestamp": datetime.utcnow().isoformat(),
            "message": log_message
        })
        save_job(job_id, job)

async def stream_logs(job_id: str):
    """Stream logs for a job"""
    while True:
        job = load_job(job_id)
        if not job:
            yield f"data: {{\"error\": \"Job not found\"}}\n\n"
            break
        
        if job["status"] in ["completed", "failed"]:
            yield f"data: {json.dumps(job)}\n\n"
            break
        
        # Send current job state
        yield f"data: {json.dumps(job)}\n\n"
        await asyncio.sleep(1)

def extract_video_frames(video_path: Path, output_dir: Path, fps: float) -> List[Path]:
    """Extract frames from video at specified FPS"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vf", f"fps={fps}",
        "-q:v", "2",
        str(output_dir / "frame_%04d.jpg")
    ]
    
    logger.info(f"Extracting frames from video: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        raise Exception(f"Frame extraction failed: {result.stderr}")
    
    # Get list of extracted frames
    frames = sorted(output_dir.glob("frame_*.jpg"))
    logger.info(f"Extracted {len(frames)} frames")
    return frames

def run_da3_inference(images_dir: Path, output_dir: Path, options: ReconstructOptions):
    """Run DA3-SMALL inference using CLI"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Build DA3 command
    cmd = [
        "da3", "auto",
        str(images_dir),
        "--model-dir", "depth-anything/da3-small",
        "--export-dir", str(output_dir),
        "--export-format", "glb",
        "--device", "cpu",
        "--process-res", "504",
        "--process-res-method", "upper_bound_resize",
    ]
    
    # Add options
    if options.show_cam:
        cmd.append("--show-cameras")
    
    logger.info(f"Running DA3 inference: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    
    if result.returncode != 0:
        error_msg = result.stderr if result.stderr else result.stdout
        raise Exception(f"DA3 inference failed (exit code {result.returncode}): {error_msg}")
    
    logger.info(f"DA3 inference completed successfully")
    logger.info(f"DA3 stdout: {result.stdout}")
    return result.stdout

async def process_image_job(job_id: str, images_data: List[Tuple[str, bytes]], options: ReconstructOptions):
    """Process images for depth estimation"""
    try:
        update_job_status(job_id, "processing", 0.1, "Uploading images...")

        # Create job directories
        job_dir = get_job_path(job_id)
        images_dir = job_dir / "images"
        output_dir = job_dir / "output"
        images_dir.mkdir(parents=True, exist_ok=True)

        # Save uploaded images from pre-read bytes
        image_paths = []
        for i, (filename, content) in enumerate(images_data):
            image_path = images_dir / f"image_{i:04d}{Path(filename).suffix}"
            with open(image_path, 'wb') as f:
                f.write(content)
            image_paths.append(image_path)
            append_job_log(job_id, f"Saved image: {filename} ({len(content)} bytes)")

        update_job_status(job_id, "processing", 0.3, f"Processing {len(images_data)} images...")

        # Run DA3 inference
        stdout = run_da3_inference(images_dir, output_dir, options)
        append_job_log(job_id, f"DA3 output: {stdout}")

        update_job_status(job_id, "processing", 0.8, "Generating outputs...")

        # Find output files
        glb_files = list(output_dir.glob("*.glb"))
        depth_files = list(output_dir.glob("*depth*"))
        rgb_files = list(output_dir.glob("*rgb*"))

        result = {
            "model3d": {
                "path": str(glb_files[0]) if glb_files else None,
                "url": f"/api/da3/jobs/{job_id}/outputs/model.glb" if glb_files else None
            },
            "depthImage": {
                "path": str(depth_files[0]) if depth_files else None,
                "url": f"/api/da3/jobs/{job_id}/outputs/depth.png" if depth_files else None
            },
            "rgbImage": {
                "path": str(rgb_files[0]) if rgb_files else None,
                "url": f"/api/da3/jobs/{job_id}/outputs/rgb.png" if rgb_files else None
            }
        }

        update_job_status(job_id, "completed", 1.0, "Processing completed successfully", result=result)
        append_job_log(job_id, "Job completed successfully")

    except Exception as e:
        logger.error(f"Image processing failed: {str(e)}", exc_info=True)
        update_job_status(job_id, "failed", 0.0, f"Processing failed: {str(e)}", error=str(e))
        append_job_log(job_id, f"Error: {str(e)}")

async def process_video_job(job_id: str, video_data: Tuple[str, bytes], sampling_fps: float, options: ReconstructOptions):
    """Process video for depth estimation with frame slicing"""
    try:
        update_job_status(job_id, "processing", 0.1, "Uploading video...")

        # Create job directories
        job_dir = get_job_path(job_id)
        video_dir = job_dir / "video"
        frames_dir = job_dir / "frames"
        output_dir = job_dir / "output"
        video_dir.mkdir(parents=True, exist_ok=True)

        # Save uploaded video from pre-read bytes
        filename, content = video_data
        video_path = video_dir / filename
        with open(video_path, 'wb') as f:
            f.write(content)

        append_job_log(job_id, f"Saved video: {filename} ({len(content)} bytes)")

        update_job_status(job_id, "processing", 0.2, f"Extracting frames at {sampling_fps} FPS...")

        # Extract frames
        frames = extract_video_frames(video_path, frames_dir, sampling_fps)
        append_job_log(job_id, f"Extracted {len(frames)} frames")

        update_job_status(job_id, "processing", 0.4, f"Processing {len(frames)} frames...")

        # Run DA3 inference on frames
        stdout = run_da3_inference(frames_dir, output_dir, options)
        append_job_log(job_id, f"DA3 output: {stdout}")

        update_job_status(job_id, "processing", 0.8, "Generating outputs...")

        # Find output files
        glb_files = list(output_dir.glob("*.glb"))
        depth_files = list(output_dir.glob("*depth*"))
        rgb_files = list(output_dir.glob("*rgb*"))

        result = {
            "model3d": {
                "path": str(glb_files[0]) if glb_files else None,
                "url": f"/api/da3/jobs/{job_id}/outputs/model.glb" if glb_files else None
            },
            "depthImage": {
                "path": str(depth_files[0]) if depth_files else None,
                "url": f"/api/da3/jobs/{job_id}/outputs/depth.png" if depth_files else None
            },
            "rgbImage": {
                "path": str(rgb_files[0]) if rgb_files else None,
                "url": f"/api/da3/jobs/{job_id}/outputs/rgb.png" if rgb_files else None
            },
            "frameCount": len(frames)
        }

        update_job_status(job_id, "completed", 1.0, "Processing completed successfully", result=result)
        append_job_log(job_id, "Job completed successfully")

    except Exception as e:
        logger.error(f"Video processing failed: {str(e)}", exc_info=True)
        update_job_status(job_id, "failed", 0.0, f"Processing failed: {str(e)}", error=str(e))
        append_job_log(job_id, f"Error: {str(e)}")

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "DA3-SMALL Depth Estimation API",
        "version": "1.0.0",
        "endpoints": {
            "create_job": "POST /api/da3/jobs",
            "get_job": "GET /api/da3/jobs/{job_id}",
            "stream_logs": "GET /api/da3/jobs/{job_id}/stream",
            "list_jobs": "GET /api/da3/jobs",
            "download_output": "GET /api/da3/jobs/{job_id}/outputs/{filename}"
        }
    }

@app.post("/api/da3/jobs")
async def create_job(
    background_tasks: BackgroundTasks,
    images: Optional[List[UploadFile]] = File(None),
    video: Optional[UploadFile] = File(None),
    job_type: str = Form(...),
    sampling_fps: float = Form(10.0),
    show_cam: bool = Form(True),
    filter_black_bg: bool = Form(False),
    filter_white_bg: bool = Form(False),
    process_res_method: str = Form("low_res"),
    save_percentage: int = Form(10),
    num_max_points: int = Form(1000),
    infer_gs: bool = Form(False),
    gs_trj_mode: str = Form("smooth"),
    gs_video_quality: str = Form("low")
):
    """Create a new depth estimation job"""

    # Validate inputs
    if job_type not in ["image", "video"]:
        raise HTTPException(status_code=400, detail="job_type must be 'image' or 'video'")

    if job_type == "image" and not images:
        raise HTTPException(status_code=400, detail="At least one image is required for image jobs")

    if job_type == "video" and not video:
        raise HTTPException(status_code=400, detail="Video is required for video jobs")

    # Create job
    job_id = str(uuid.uuid4())
    options = ReconstructOptions(
        show_cam=show_cam,
        filter_black_bg=filter_black_bg,
        filter_white_bg=filter_white_bg,
        process_res_method=process_res_method,  # type: ignore
        save_percentage=save_percentage,
        num_max_points=num_max_points,
        infer_gs=infer_gs,
        gs_trj_mode=gs_trj_mode,  # type: ignore
        gs_video_quality=gs_video_quality  # type: ignore
    )

    job_data = {
        "job_id": job_id,
        "job_type": job_type,
        "status": "pending",
        "progress": 0.0,
        "message": "Job created",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "options": options.dict(),
        "logs": []
    }

    save_job(job_id, job_data)

    # Read file content before background task (UploadFile.file gets closed)
    if job_type == "image":
        # Pre-read all image content
        images_data: List[Tuple[str, bytes]] = []
        for image in images:
            content = await image.read()
            images_data.append((image.filename, content))
        background_tasks.add_task(process_image_job, job_id, images_data, options)
    else:
        # Pre-read video content
        content = await video.read()
        video_data = (video.filename, content)
        background_tasks.add_task(process_video_job, job_id, video_data, sampling_fps, options)

    return {"job_id": job_id, "status": "pending", "message": "Job created successfully"}

@app.get("/api/da3/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job status"""
    job = load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/da3/jobs/{job_id}/stream")
async def stream_job_logs(job_id: str):
    """Stream job logs and status updates"""
    job = load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return StreamingResponse(
        stream_logs(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/api/da3/jobs")
async def list_jobs(status: Optional[str] = None):
    """List all jobs, optionally filtered by status"""
    all_jobs = []
    for job_file in JOBS_DIR.glob("*/job.json"):
        with open(job_file, 'r') as f:
            job = json.load(f)
            if status is None or job.get("status") == status:
                all_jobs.append(job)
    
    # Sort by created_at descending
    all_jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"jobs": all_jobs}

@app.get("/api/da3/jobs/{job_id}/outputs/{filename}")
async def download_output(job_id: str, filename: str):
    """Download output file from a job"""
    job = load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    output_dir = get_job_path(job_id) / "output"
    file_path = output_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@app.delete("/api/da3/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its files"""
    job = load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_path = get_job_path(job_id)
    if job_path.exists():
        shutil.rmtree(job_path)
    
    if job_id in jobs:
        del jobs[job_id]
    
    return {"message": "Job deleted successfully"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
