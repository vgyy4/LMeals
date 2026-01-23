import yt_dlp
import os
import math
from pydub import AudioSegment
import uuid

def get_video_metadata(url: str):
    """Extracts title, thumbnail, and checks for existing subtitles."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'writesubtitles': True,
        'allsubtitles': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", "Video Recipe"),
                "thumbnail": info.get("thumbnail"),
                "subtitles": info.get("subtitles", {}),
                "description": info.get("description", ""),
                "duration": info.get("duration", 0)
            }
    except Exception as e:
        print(f"Error extracting metadata: {e}")
        return {
            "title": "Video Recipe",
            "thumbnail": None,
            "subtitles": {},
            "description": "",
            "duration": 0
        }

def get_subtitle_text(url: str) -> str:
    """Attempts to download and extract text from subtitles/captions."""
    output_dir = "temp_subs"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    file_id = str(uuid.uuid4())
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en.*', 'en'],
        'outtmpl': os.path.join(output_dir, f"{file_id}.%(ext)s"),
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        # Find the downloaded subtitle file
        import re
        for f in os.listdir(output_dir):
            if f.startswith(file_id) and f.endswith(('.vtt', '.srt')):
                file_path = os.path.join(output_dir, f)
                with open(file_path, 'r', encoding='utf-8') as sf:
                    content = sf.read()
                    
                # Clean up VTT/SRT tags and timestamps
                # Remove WEBVTT header
                content = re.sub(r'WEBVTT.*?\n', '', content, flags=re.DOTALL)
                # Remove timestamps (00:00:00.000 -> 00:00:00.000)
                content = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*?\n', '', content)
                # Remove line numbers and tags
                content = re.sub(r'<.*?>', '', content)
                content = re.sub(r'^\d+\n', '', content, flags=re.MULTILINE)
                
                # Deduplicate repeated lines (common in YouTube auto-subs)
                lines = content.splitlines()
                clean_lines = []
                for line in lines:
                    line = line.strip()
                    if line and (not clean_lines or line != clean_lines[-1]):
                        clean_lines.append(line)
                
                # Cleanup temp file
                os.remove(file_path)
                return " ".join(clean_lines)
    except Exception as e:
        print(f"Error fetching subtitles: {e}")
        
    return ""

def download_audio(url: str, output_dir: str = "temp_audio") -> str:
    """Downloads audio from a URL and returns the path to the MP3 file."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    file_id = str(uuid.uuid4())
    output_template = os.path.join(output_dir, f"{file_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': output_template,
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"Error downloading audio: {e}")
        return ""
        
    final_path = os.path.join(output_dir, f"{file_id}.mp3")
    if os.path.exists(final_path):
        if os.path.getsize(final_path) == 0:
            print(f"ERROR: Downloaded audio file is empty: {final_path}")
            os.remove(final_path)
            return ""
        return final_path
    else:
        return ""

def chunk_audio(file_path: str, max_size_mb: int = 24) -> list[str]:
    """Splits an audio file into chunks smaller than max_size_mb."""
    if not file_path or not os.path.exists(file_path):
        return []
    
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb <= max_size_mb:
        return [file_path]
    
    audio = AudioSegment.from_mp3(file_path)
    # Estimate chunk duration based on data rate
    total_ms = len(audio)
    num_chunks = math.ceil(file_size_mb / max_size_mb)
    chunk_ms = total_ms / num_chunks
    
    chunks = []
    base_dir = os.path.dirname(file_path)
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    
    for i in range(num_chunks):
        start_ms = i * chunk_ms
        end_ms = min((i + 1) * chunk_ms, total_ms)
        chunk = audio[start_ms:end_ms]
        
        chunk_path = os.path.join(base_dir, f"{base_name}_part{i}.mp3")
        chunk.export(chunk_path, format="mp3")
        chunks.append(chunk_path)
        
    return chunks

def capture_frames(url: str, timestamps: list[int]) -> list[str]:
    """
    REBUILT FROM SCRATCH: Simple, direct frame capture using pytubefix.
    1. Download video with pytubefix to /app/static/images/recipes/candidates/
    2. Extract frames directly from that location
    3. Return paths to the frame images
    4. Clean up video file
    """
    import subprocess
    
    # Use absolute paths - no reliance on assets.py
    static_base = "/app/static" if os.path.exists("/app/static") else os.path.join(os.path.dirname(__file__), "static")
    candidates_dir = os.path.join(static_base, "images", "recipes", "candidates")
    os.makedirs(candidates_dir, exist_ok=True)
    
    print(f"DEBUG: [REBUILD] Static base: {static_base}")
    print(f"DEBUG: [REBUILD] Candidates dir: {candidates_dir}")
    print(f"DEBUG: [REBUILD] Candidates exists: {os.path.exists(candidates_dir)}")
    
    video_id = str(uuid.uuid4())
    video_path = os.path.join(candidates_dir, f"temp_video_{video_id}.mp4")
    
    # Download video with pytubefix
    try:
        print(f"DEBUG: [REBUILD] Downloading video with pytubefix...")
        from pytubefix import YouTube
        
        yt = YouTube(url)
        # Get lowest quality stream for faster download
        stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').first()
        
        if not stream:
            print("DEBUG: [REBUILD] No suitable stream found")
            return []
        
        print(f"DEBUG: [REBUILD] Downloading {stream.resolution} stream...")
        stream.download(output_path=candidates_dir, filename=f"temp_video_{video_id}.mp4")
        
        if not os.path.exists(video_path):
            print(f"DEBUG: [REBUILD] Video file not found at {video_path}")
            return []
        
        print(f"DEBUG: [REBUILD] Video downloaded: {os.path.getsize(video_path)} bytes")
        
    except Exception as e:
        print(f"DEBUG: [REBUILD] Download failed: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    # Extract frames
    captured_frames = []
    print(f"DEBUG: [REBUILD] Extracting {len(timestamps)} frames...")
    
    for ts in timestamps:
        frame_id = str(uuid.uuid4())
        frame_filename = f"{frame_id}.jpg"
        frame_path = os.path.join(candidates_dir, frame_filename)
        
        ffmpeg_cmd = [
            'ffmpeg', '-y', '-ss', str(ts), '-i', video_path,
            '-frames:v', '1', '-q:v', '2', frame_path
        ]
        
        try:
            result = subprocess.run(ffmpeg_cmd, capture_output=True, timeout=10)
            
            if os.path.exists(frame_path) and os.path.getsize(frame_path) > 0:
                # Return relative path for frontend
                rel_path = f"images/recipes/candidates/{frame_filename}"
                captured_frames.append(rel_path)
                print(f"DEBUG: [REBUILD] Frame {ts}s saved: {frame_path} ({os.path.getsize(frame_path)} bytes) -> {rel_path}")
            else:
                print(f"DEBUG: [REBUILD] Frame {ts}s failed - file missing or empty")
                
        except Exception as e:
            print(f"DEBUG: [REBUILD] Frame {ts}s error: {e}")
    
    # Clean up video file
    try:
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"DEBUG: [REBUILD] Cleaned up video file")
    except Exception as e:
        print(f"DEBUG: [REBUILD] Cleanup error: {e}")
    
    print(f"DEBUG: [REBUILD] Extraction complete. Captured {len(captured_frames)} frames")
    
    # VERIFICATION: Prove files still exist after extraction
    print(f"DEBUG: [REBUILD] VERIFICATION - Listing candidates directory:")
    try:
        files_in_dir = os.listdir(candidates_dir)
        print(f"DEBUG: [REBUILD] Files in {candidates_dir}: {files_in_dir}")
        for frame_file in [f.split('/')[-1] for f in captured_frames]:
            full_path = os.path.join(candidates_dir, frame_file)
            if os.path.exists(full_path):
                print(f"DEBUG: [REBUILD] ✓ {frame_file} exists ({os.path.getsize(full_path)} bytes)")
            else:
                print(f"DEBUG: [REBUILD] ✗ {frame_file} MISSING!")
    except Exception as e:
        print(f"DEBUG: [REBUILD] Verification error: {e}")
    
    return captured_frames

def cleanup_files(files: list[str]):
    """Removes temporary files."""
    for f in files:
        if not f: continue
        # Handle both relative paths and absolute paths
        if not f.startswith('/') and not (len(f) > 1 and f[1] == ':'):
            import assets
            f = os.path.join(assets.STATIC_DIR, f)
            
        if os.path.exists(f):
            try:
                os.remove(f)
                print(f"DEBUG: Cleaned up temp file {f}")
            except:
                pass
