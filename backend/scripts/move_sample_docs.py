from pathlib import Path
src = Path(r'C:\Users\thear\OneDrive\Documents\Desktop\AssessIQ\backend\backend\sample_docs')
dst = Path(r'C:\Users\thear\OneDrive\Documents\Desktop\AssessIQ\backend\sample_docs')
dst.mkdir(parents=True, exist_ok=True)
for p in src.iterdir():
    if p.is_file():
        (dst / p.name).write_bytes(p.read_bytes())
        p.unlink()
print('moved', [f.name for f in dst.iterdir()])
