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
        'noplaylist': True,
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
        'noplaylist': True,
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

def capture_video_frames(url: str, timestamps: list[float] = [0.05, 5, 10, 15]) -> list[str]:
    """
    Downloads the first 20 seconds of a video and extracts frames at specified timestamps.
    Returns a list of relative paths to the extracted images.
    """
    import subprocess
    import shutil
    import assets
    
    # 1. Setup paths
    candidates_dir = os.path.join(assets.STATIC_DIR, "images", "recipes", "candidates")
    os.makedirs(candidates_dir, exist_ok=True)
    
    temp_video_dir = os.path.join(os.getcwd(), f"temp_video_{uuid.uuid4()}")
    os.makedirs(temp_video_dir, exist_ok=True)
    
    unique_id = str(uuid.uuid4())
    video_path_template = os.path.join(temp_video_dir, f"{unique_id}.%(ext)s")
    
    # 2. Download first 20 seconds of video
    # Using lower quality format to save memory and bandwidth in restricted environments
    ydl_opts = {
        'format': 'best[height<=360]/worst',  # Prefer low res for frames
        'outtmpl': video_path_template,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'download_ranges': lambda _, __: [{'start_time': 0, 'end_time': 20}],
        'force_keyframes_at_cuts': True,
    }
    
    downloaded_video_path = None
    try:
        print(f"DEBUG: Attempting to download video clip for frames: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        # Find the downloaded file
        for f in os.listdir(temp_video_dir):
            if f.startswith(unique_id) and not f.endswith(".part"):
                downloaded_video_path = os.path.join(temp_video_dir, f)
                break
                
        if not downloaded_video_path:
            print("ERROR: Could not find downloaded video clip (or download failed).")
            return []

        # 3. Extract frames using ffmpeg
        extracted_paths = []
        for ts in timestamps:
            output_filename = f"{unique_id}_frame_{ts}s.jpg"
            output_path = os.path.join(candidates_dir, output_filename)
            
            # Use -ss BEFORE -i for faster seeking and lower resource usage
            cmd = [
                'ffmpeg',
                '-ss', str(ts),
                '-i', downloaded_video_path,
                '-frames:v', '1',
                '-q:v', '4',  # Decent quality but smaller size
                '-y',
                output_path
            ]
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    print(f"WARNING: ffmpeg failed for timestamp {ts}s: {result.stderr}")
                
                if os.path.exists(output_path):
                    relative_path = f"images/recipes/candidates/{output_filename}"
                    extracted_paths.append(relative_path)
            except subprocess.TimeoutExpired:
                print(f"WARNING: ffmpeg timed out for timestamp {ts}s")
            except Exception as fe:
                print(f"WARNING: ffmpeg error: {fe}")
                
        return extracted_paths
        
    except Exception as e:
        print(f"ERROR capturing video frames: {e}")
        return []
    finally:
        # 4. Cleanup temp video directory
        if os.path.exists(temp_video_dir):
            shutil.rmtree(temp_video_dir, ignore_errors=True)

