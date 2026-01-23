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
    Captures frames from a video URL at specific timestamps using ffmpeg.
    Returns a list of local relative paths to the captured images.
    """
    import subprocess
    import assets # For path configuration
    
    output_dir = os.path.join(assets.IMAGES_DIR, "candidates")
    os.makedirs(output_dir, exist_ok=True)
    
    # Get the actual stream URL
    ydl_opts = {'format': 'bestvideo', 'quiet': True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info['url']
    except Exception as e:
        print(f"Error getting stream URL: {e}")
        return []

    captured_files = []
    for timestamp in timestamps:
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.jpg"
        filepath = os.path.join(output_dir, filename)
        
        # ffmpeg command to capture a single frame at a specific time
        cmd = [
            'ffmpeg',
            '-ss', str(timestamp),
            '-i', stream_url,
            '-frames:v', '1',
            '-q:v', '2',
            '-y',
            filepath
        ]
        
        try:
            print(f"DEBUG: Capturing frame at {timestamp}s")
            subprocess.run(cmd, check=True, capture_output=True)
            captured_files.append(f"images/recipes/candidates/{filename}")
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error at {timestamp}s: {e.stderr.decode()}")
            
    return captured_files

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
