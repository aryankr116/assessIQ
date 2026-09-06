import requests, os, time

base = "http://localhost:8000/api"
upload_dir = "backend/.assessiq_data/uploads"

# Original PDF names from the old documents.json
original_names = {
    "doc_a31f2db0fb": "Campus2027- DeviceSW-JD (1).pdf",
    "doc_5b97821532": "Campus2027- Device QA IOT-SDET (2).pdf",
    "doc_811669a3bd": "Biocon-Biologics-Factsheet.pdf",
    "doc_e7a20b0c14": "BMSCE_Placement_Policy_Student_Guide 270326 (3).pdf",
}

# Re-upload the original PDFs
for doc_id, name in original_names.items():
    ext = "." + name.rsplit(".", 1)[-1]
    path = os.path.join(upload_dir, f"{doc_id}{ext}")
    if not os.path.exists(path) or os.path.getsize(path) < 100:
        print(f"SKIP {name}: file too small or missing")
        continue

    with open(path, "rb") as f:
        resp = requests.post(f"{base}/documents", files={"file": (name, f)})
        if resp.ok:
            r = resp.json()
            print(f"OK {name}: {r.get('chunks', 0)} chunks")
        else:
            print(f"FAIL {name}: {resp.status_code}")
    time.sleep(1)

# Also re-upload any other valid PDFs not yet indexed
indexed = {d["name"] for d in requests.get(f"{base}/documents").json()}
for fname in os.listdir(upload_dir):
    if not fname.endswith(".pdf"):
        continue
    doc_id_from_file = fname.rsplit(".", 1)[0]
    fpath = os.path.join(upload_dir, fname)
    if os.path.getsize(fpath) < 100:
        continue
    # Check if any indexed doc has this file
    already = any(doc_id_from_file in d.get("id", "") for d in requests.get(f"{base}/documents").json())
    if already:
        continue
    # Try to find original name
    real_name = original_names.get(doc_id_from_file, fname)
    with open(fpath, "rb") as f:
        resp = requests.post(f"{base}/documents", files={"file": (real_name, f)})
        if resp.ok:
            r = resp.json()
            print(f"OK EXTRA {real_name}: {r.get('chunks', 0)} chunks")
        else:
            print(f"SKIP EXTRA {real_name}: {resp.status_code}")
    time.sleep(1)

docs = requests.get(f"{base}/documents").json()
indexed_count = sum(1 for d in docs if d["status"] == "indexed")
print(f"\nTotal: {len(docs)} docs, {indexed_count} indexed")
