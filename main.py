import os
import shutil
import sqlite3
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="MedHist Health Vault API")

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("MEDHIST_DATA_DIR", BASE_DIR)
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
STATIC_DIR = BASE_DIR

os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

DB_PATH = os.path.join(DATA_DIR, "midhist.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)
    # Medical records table (Cardiac, Sugar, BP, Ortho, General)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            doctor TEXT,
            notes TEXT,
            record_date TEXT NOT NULL,
            file_name TEXT
        )
    """)
    # Medicines table (Current vs Past/Previous illness)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            condition TEXT NOT NULL,
            status TEXT NOT NULL, -- 'active' or 'past'
            dosage TEXT NOT NULL,
            doctor TEXT
        )
    """)
    # Seed default patient if not exists
    cursor.execute("SELECT id FROM users WHERE id = 'MH-DEMO-0001'")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            ("MH-DEMO-0001", "Demo Patient", "demo@example.com", "patient", "pass123")
        )
        # Seed initial records
        seed_records = [
            ("MH-DEMO-0001", "False X-Ray Scan Report", "Ortho", "Dr. Fake Imaging Center", "Demo false X-ray result: mild joint swelling is shown despite no clinical symptoms.", "2026-03-15", "fake_xray.png"),
            ("MH-DEMO-0001", "False Cardiac Health Report", "Cardiac", "Dr. Fake Cardio Clinic", "Demo false cardiac report: elevated risk markers are shown without confirmed diagnosis.", "2026-04-10", "fake_cardiac.pdf"),
            ("MH-DEMO-0001", "False Sugar Pressure Summary", "Sugar", "Health Demo Lab", "Demo false sugar report: abnormal fasting numbers are simulated for presentation purposes.", "2026-02-18", "fake_sugar.pdf"),
            ("MH-DEMO-0001", "Ambulatory Blood Pressure", "BP", "Dr. S. Chatterjee", "Average day reading 124/82 mmHg. Well controlled.", "2026-02-18", "bp_log.pdf"),
            ("MH-DEMO-0001", "2D Echocardiogram", "Cardiac", "Dr. R. Banerjee", "Ejection fraction: 62%. Normal LV function.", "2026-03-15", "echo_scan.pdf"),
            ("MH-DEMO-0001", "HbA1c & Fasting Glucose", "Sugar", "Suraksha Labs", "HbA1c: 6.5%. Fasting Sugar: 110 mg/dL.", "2026-04-10", "blood_sugar.pdf"),
            ("MH-DEMO-0001", "Right Knee Joint X-Ray", "Ortho", "Apex Ortho Center", "Mild joint space reduction. Early wear.", "2025-11-04", "knee_xray.png")
        ]
        cursor.executemany("INSERT INTO records (user_id, title, category, doctor, notes, record_date, file_name) VALUES (?, ?, ?, ?, ?, ?, ?)", seed_records)
        
        # Seed initial medicines
        seed_meds = [
            ("MH-DEMO-0001", "False Sugar Pressure Tablet", "BP", "active", "1 tablet once daily morning", "Dr. Demo Pressure Clinic"),
            ("MH-DEMO-0001", "Fake Cardiatic Control Tablet", "Cardiac", "active", "1 tablet after breakfast", "Dr. Demo Heart Care"),
            ("MH-DEMO-0001", "Demo Sugar Balance Tablet", "Sugar", "active", "1 tablet after dinner", "Dr. N. Sengupta"),
            ("MH-DEMO-0001", "Telmisartan 40mg", "BP", "active", "1 tablet once daily morning", "Dr. S. Chatterjee"),
            ("MH-DEMO-0001", "Metformin 500mg", "Sugar", "active", "1 tablet after dinner", "Dr. N. Sengupta"),
            ("MH-DEMO-0001", "Glimepiride 1mg", "Sugar", "past", "Discontinued due to hypoglycemia in 2025", "Dr. N. Sengupta"),
            ("MH-DEMO-0001", "Atorvastatin 10mg", "Cardiac", "past", "Completed 6-month therapy in 2024", "Dr. R. Banerjee")
        ]
        cursor.executemany("INSERT INTO medicines (user_id, name, condition, status, dosage, doctor) VALUES (?, ?, ?, ?, ?, ?)", seed_meds)
        conn.commit()
    conn.close()

init_db()

# Page Route
@app.get("/login", include_in_schema=False)
def login_page():
    return RedirectResponse(url="/", status_code=303)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


@app.get("/healthz", include_in_schema=False)
def health_check():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("SELECT 1")
    return {"status": "ok"}


# API: Login
@app.post("/api/login")
def login(name: str = Form(...), email: str = Form(...), role: str = Form(...), password: str = Form(...)):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role, password FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        if user:
            if user[4] != password:
                raise HTTPException(status_code=401, detail="Incorrect email or password")
            user_data = {"id": user[0], "name": user[1], "email": user[2], "role": user[3]}
        else:
            user_id = f"MH-2026-{os.urandom(2).hex().upper()}"
            cursor.execute(
                "INSERT INTO users VALUES (?, ?, ?, ?, ?)",
                (user_id, name, email, role, password),
            )
            user_data = {"id": user_id, "name": name, "email": email, "role": role}
    return user_data

# API: Get Records
@app.get("/api/records")
def get_records(user_id: str, category: str | None = None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if category and category != "all":
        cursor.execute("SELECT id, user_id, title, category, doctor, notes, record_date, file_name FROM records WHERE user_id = ? AND category = ? ORDER BY record_date DESC", (user_id, category))
    else:
        cursor.execute("SELECT id, user_id, title, category, doctor, notes, record_date, file_name FROM records WHERE user_id = ? ORDER BY record_date DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "user_id": r[1], "title": r[2], "category": r[3], "doctor": r[4], "notes": r[5], "date": r[6], "fileName": r[7]} for r in rows]


def create_demo_report_pdf(title: str, category: str, doctor: str, notes: str, record_date: str) -> bytes:
    def pdf_text(value: str) -> str:
        value = value.encode("latin-1", "replace").decode("latin-1")
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    content_lines = [
        ("MedHist - Demonstration Report", 18),
        ("DEMO ONLY - NOT A REAL MEDICAL REPORT", 14),
        ("Not valid for diagnosis, treatment, or medication decisions.", 10),
        ("", 10),
        (f"Report: {title}", 12),
        (f"Category: {category}", 12),
        (f"Date: {record_date}", 12),
        (f"Provider: {doctor or 'Not specified'}", 12),
        ("", 10),
        ("Notes:", 12),
    ]
    notes_words = (notes or "No notes provided.").split()
    note_lines = []
    current_line = ""
    for word in notes_words:
        if len(current_line) + len(word) + 1 > 82:
            note_lines.append(current_line)
            current_line = word
        else:
            current_line = f"{current_line} {word}".strip()
    if current_line:
        note_lines.append(current_line)
    content_lines.extend((line, 11) for line in note_lines)

    commands = []
    y = 750
    for line, font_size in content_lines:
        if line:
            commands.append(
                f"BT /F1 {font_size} Tf 50 {y} Td ({pdf_text(line)}) Tj ET"
            )
        y -= 24 if font_size >= 14 else 19

    stream = "\n".join(commands).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii") + obj + b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


@app.get("/api/records/{record_id}/pdf")
def download_record_pdf(record_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        record = conn.execute(
            "SELECT title, category, doctor, notes, record_date FROM records WHERE id = ?",
            (record_id,),
        ).fetchone()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    pdf = create_demo_report_pdf(*record)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="medhist-report-{record_id}.pdf"'},
    )


# API: Upload Medical Record
@app.post("/api/records")
def create_record(
    user_id: str = Form(...),
    title: str = Form(...),
    category: str = Form(...),
    doctor: str = Form(""),
    notes: str = Form(""),
    date: str = Form(...),
    file: Annotated[UploadFile | None, File()] = None
):
    saved_filename = "No file attached"
    if file and file.filename:
        saved_filename = f"{int(os.path.getmtime(DB_PATH))}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, saved_filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO records (user_id, title, category, doctor, notes, record_date, file_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, title, category, doctor, notes, date, saved_filename)
    )
    conn.commit()
    conn.close()
    return {"message": "Record successfully added"}

# API: Delete Record
@app.delete("/api/records/{record_id}")
def delete_record(record_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM records WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return {"message": "Record deleted"}

# API: Get Medicines
@app.get("/api/medicines")
def get_medicines(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, name, condition, status, dosage, doctor FROM medicines WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": m[0], "user_id": m[1], "name": m[2], "condition": m[3], "status": m[4], "dosage": m[5], "doctor": m[6]} for m in rows]

# API: Add Medicine
@app.post("/api/medicines")
def add_medicine(
    user_id: str = Form(...),
    name: str = Form(...),
    condition: str = Form(...),
    status: str = Form(...),
    dosage: str = Form(...),
    doctor: str = Form("")
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO medicines (user_id, name, condition, status, dosage, doctor) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, name, condition, status, dosage, doctor)
    )
    conn.commit()
    conn.close()
    return {"message": "Medicine added"}

# API: Toggle Medicine Status (Active <-> Past)
@app.put("/api/medicines/{med_id}/status")
def update_med_status(med_id: int, status: str = Form(...)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE medicines SET status = ? WHERE id = ?", (status, med_id))
    conn.commit()
    conn.close()
    return {"message": "Status updated"}

# API: Delete Medicine
@app.delete("/api/medicines/{med_id}")
def delete_medicine(med_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medicines WHERE id = ?", (med_id,))
    conn.commit()
    conn.close()
    return {"message": "Medicine deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=False,
    )