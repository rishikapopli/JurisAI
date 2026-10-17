#!/usr/bin/env python3
import base64, hashlib, hmac, http.cookies, json, mimetypes, os, queue, secrets, socket, sqlite3, sys, threading, time, traceback, uuid, zipfile
import html as htmllib
import re
from io import BytesIO
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(__file__).resolve().parent / 'data' / 'jurisai.sqlite3'
UPLOAD_DIR = Path(__file__).resolve().parent / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
HOST = os.environ.get('JURISAI_HOST', '127.0.0.1')
PORT = int(os.environ.get('JURISAI_PORT', '8787'))
DEV = os.environ.get('JURISAI_ENV', 'development') != 'production'
MAX_UPLOAD = 50 * 1024 * 1024
OCR_MAX_PAGES = int(os.environ.get('JURISAI_OCR_MAX_PAGES', '40'))
OCR_MIN_CHARS_PER_PAGE = 40
ALLOWED_EXT = {'.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff'}
MIME_BY_EXT = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
}


def db():
    c = sqlite3.connect(DB_PATH, timeout=20)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c


def init_db():
    c = db()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Legal researcher',
      org TEXT NOT NULL DEFAULT 'Personal workspace', verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification_codes (
      email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, type TEXT, size INTEGER DEFAULT 0, pages INTEGER DEFAULT 0, mime TEXT,
      status TEXT NOT NULL DEFAULT 'ready', archived INTEGER NOT NULL DEFAULT 0,
      security TEXT NOT NULL DEFAULT 'verified', analysis TEXT NOT NULL DEFAULT 'not_started',
      sha256 TEXT, storage_name TEXT, extracted_text TEXT NOT NULL DEFAULT '', metadata_json TEXT NOT NULL DEFAULT '{}',
      scan_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event TEXT NOT NULL, object_name TEXT, detail TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      finding_id TEXT NOT NULL, doc_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      decision TEXT NOT NULL DEFAULT 'pending', notes TEXT NOT NULL DEFAULT '',
      reviewer TEXT NOT NULL DEFAULT 'User', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_finding ON reviews(finding_id);
    ''')
    cols={r['name'] for r in c.execute('PRAGMA table_info(documents)').fetchall()}
    for name, decl in [('extracted_text', "TEXT NOT NULL DEFAULT ''"), ('metadata_json', "TEXT NOT NULL DEFAULT '{}'"), ('scan_json', "TEXT NOT NULL DEFAULT '{}'"), ('analysis_json', "TEXT DEFAULT NULL")]:
        if name not in cols: c.execute('ALTER TABLE documents ADD COLUMN %s %s' % (name,decl))
    c.commit(); c.close()


def now_iso(): return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
def uid(prefix='u'): return prefix + '_' + secrets.token_urlsafe(12)
def norm_email(e): return str(e or '').strip().lower()


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 210_000)
    return 'pbkdf2$210000$%s$%s' % (base64.urlsafe_b64encode(salt).decode(), base64.urlsafe_b64encode(digest).decode())


def check_password(password, encoded):
    try:
        _, rounds, salt, digest = encoded.split('$')
        got = hashlib.pbkdf2_hmac('sha256', password.encode(), base64.urlsafe_b64decode(salt), int(rounds))
        return hmac.compare_digest(base64.urlsafe_b64encode(got).decode(), digest)
    except Exception: return False


def public_user(r):
    return {'id': r['id'], 'name': r['name'], 'email': r['email'], 'role': r['role'], 'org': r['org'], 'verified': bool(r['verified'])}


def seed_defaults(c, user_id):
    settings = {'jur':'uk','lang':'en','theme':'ivory','dateFmt':'dmy','collapsed':False,'cite':'numbered','sourceDisplay':'panel','research':'balanced','showInference':True,'speed':1,'voice':'Neutral (UK)','voiceInput':True,'retention':'12','autoDelete':False,'analytics':False,'training':False,'twofa':False,'secNotify':True,'notifyEmail':True,'notifyBrowser':False,'notifyDigest':'daily'}
    c.execute('INSERT OR IGNORE INTO settings(user_id,payload,updated_at) VALUES(?,?,?)', (user_id, json.dumps(settings), now_iso()))
    # Seed benchmark legal demonstration documents
    existing = c.execute("SELECT COUNT(*) FROM documents WHERE user_id=?", (user_id,)).fetchone()[0]
    if existing == 0:
        templates = c.execute("SELECT name, type, size, pages, mime, status, security, analysis, sha256, storage_name, extracted_text, metadata_json, scan_json, analysis_json FROM documents WHERE name IN ('Employment Agreement.docx', 'Company Policy Handbook.docx') GROUP BY name").fetchall()
        now = now_iso()
        for tmpl in templates:
            new_doc_id = uid('doc')
            c.execute("""
                INSERT INTO documents (
                    id, user_id, name, type, size, pages, mime, status, archived, security,
                    analysis, sha256, storage_name, extracted_text, metadata_json, scan_json, analysis_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_doc_id, user_id, tmpl['name'], tmpl['type'], tmpl['size'], tmpl['pages'], tmpl['mime'],
                tmpl['status'], tmpl['security'], tmpl['analysis'], tmpl['sha256'], tmpl['storage_name'],
                tmpl['extracted_text'], tmpl['metadata_json'], tmpl['scan_json'], tmpl['analysis_json'],
                now, now
            ))


def session_user(handler):
    raw = handler.headers.get('Cookie','')
    jar = http.cookies.SimpleCookie(); jar.load(raw)
    sid = jar.get('jurisai_session')
    if not sid: return None
    c = db(); r = c.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?', (sid.value, int(time.time()))).fetchone(); c.close()
    return r


def json_body(handler):
    n = int(handler.headers.get('Content-Length','0') or 0)
    raw = handler.rfile.read(n) if n else b'{}'
    try: return json.loads(raw.decode('utf-8'))
    except Exception: return {}


def check_image(payload, ext, meta):
    sig_ok=(ext=='.png' and payload.startswith(b'\x89PNG\r\n\x1a\n')) or (ext in ('.jpg','.jpeg') and payload.startswith(b'\xff\xd8\xff')) or (ext in ('.tif','.tiff') and payload[:4] in (b'II*\x00',b'MM\x00*'))
    if not sig_ok: raise ValueError('The file signature does not match its image extension.')
    try: from PIL import Image
    except ImportError: meta['image_check']='Pillow is not installed; image decoding was not verified.'; return
    Image.MAX_IMAGE_PIXELS=120_000_000
    try:
        with Image.open(BytesIO(payload)) as im:
            meta.update({'width':im.width,'height':im.height,'image_mode':im.mode,'pages':int(getattr(im,'n_frames',1) or 1)})
            im.verify()
    except Image.DecompressionBombError: raise ValueError('The image dimensions exceed the supported safety limit.')
    except Exception as e: raise ValueError('The image could not be decoded: '+str(e)[:160])


def docx_text(root):
    W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'; out=[]
    for p in root.iter(W+'p'):
        buf=[]
        for el in p.iter():
            if el.tag==W+'t' and el.text: buf.append(el.text)
            elif el.tag==W+'tab': buf.append('\t')
            elif el.tag in (W+'br',W+'cr'): buf.append('\n')
        out.append(''.join(buf))
    return '\n'.join(out)


def pdf_page_texts(src):
    """Native text per page via pypdf. Returns (texts, reader_meta) or raises."""
    from pypdf import PdfReader
    reader=PdfReader(src,strict=False); info={}
    if reader.is_encrypted:
        try: ok=reader.decrypt('')
        except Exception: ok=0
        if not ok: return None, {'encrypted':True}
    texts=[]
    for p in reader.pages:
        try: texts.append(p.extract_text() or '')
        except Exception: texts.append('')
    try:
        md=reader.metadata
        if md: info={'title':str(md.title or ''),'author':str(md.author or '')}
    except Exception: pass
    return texts, info


def save_upload(user_id, filename, payload, mime):
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValueError('This file type is not supported. Upload PDF, DOCX, TXT, PNG, JPG, or TIFF.')
    if len(payload) > MAX_UPLOAD:
        raise ValueError('Files must be 50 MB or smaller.')
    if not payload: raise ValueError('Upload is empty.')
    meta={'extension':ext[1:], 'bytes':len(payload)}; text=''; need_ocr=False
    if ext=='.pdf':
        if not payload.startswith(b'%PDF-'): raise ValueError('The file does not have a valid PDF signature.')
        if b'%%EOF' not in payload[-8192:]: raise ValueError('The PDF appears incomplete or corrupted (missing end-of-file marker).')
        meta['pages']=len(re.findall(rb'/Type\s*/Page\b',payload))
        try:
            texts,info=pdf_page_texts(BytesIO(payload))
        except ImportError:
            texts,info=None,{}; need_ocr=True; meta['text_source']='none'
        except Exception as e: raise ValueError('PDF structure could not be read: '+str(e)[:180])
        meta.update(info)
        if info.get('encrypted'):
            meta['extraction']='Password-protected PDF: the file is stored, but text extraction and OCR are unavailable.'
        elif texts is not None:
            if not texts: raise ValueError('The PDF contains no pages.')
            meta['pages']=len(texts); text='\n\n'.join(t.strip() for t in texts); meta['text_source']='native'
            need_ocr=any(len(t.strip())<OCR_MIN_CHARS_PER_PAGE for t in texts)
    elif ext=='.docx':
        if not payload.startswith(b'PK\x03\x04'): raise ValueError('The file does not have a valid DOCX signature.')
        try:
            with zipfile.ZipFile(BytesIO(payload)) as z:
                infos=z.infolist(); names=z.namelist()
                if len(infos)>1000 or sum(x.file_size for x in infos)>200*1024*1024 or any(x.file_size>max(1,x.compress_size)*1000 for x in infos): raise ValueError('DOCX archive expands beyond the supported safety limits.')
                if z.testzip(): raise ValueError('The DOCX archive is damaged.')
                if 'word/document.xml' not in names: raise ValueError('The DOCX document body is missing.')
                if any(n.lower().endswith('vbaproject.bin') for n in names): raise ValueError('Macro-enabled Word content is not accepted.')
                from xml.etree import ElementTree as ET
                text=docx_text(ET.fromstring(z.read('word/document.xml'))); meta['text_source']='native'
                if 'docProps/core.xml' in names:
                    props=ET.fromstring(z.read('docProps/core.xml'))
                    meta['title']=next((e.text or '' for e in props if e.tag.endswith('}title')),'')
                    meta['author']=next((e.text or '' for e in props if e.tag.endswith('}creator')),'')
                if 'docProps/app.xml' in names:
                    m=re.search(rb'<Pages>(\d+)</Pages>',z.read('docProps/app.xml'))
                    if m: meta['pages']=int(m.group(1))
        except ValueError: raise
        except Exception as e: raise ValueError('DOCX structure could not be read: '+str(e)[:180])
    elif ext=='.txt':
        if payload.startswith((b'\xff\xfe',b'\xfe\xff')):
            try: text=payload.decode('utf-16'); enc='utf-16'
            except UnicodeDecodeError: raise ValueError('The UTF-16 text file is malformed.')
        else:
            if b'\x00' in payload: raise ValueError('Text file contains binary data.')
            try: text=payload.decode('utf-8-sig'); enc='utf-8'
            except UnicodeDecodeError: text=payload.decode('cp1252',errors='replace'); enc='windows-1252'
        meta['encoding']=enc; meta['text_source']='native'
    else:
        check_image(payload, ext, meta); need_ocr=True
    if need_ocr: meta['ocr']={'status':'queued'}
    elif not text.strip() and 'extraction' not in meta: meta['extraction']='The document contains no extractable text.'
    meta['chars']=len(text); meta['words']=len(text.split())
    safe = secrets.token_hex(16) + ext
    target = UPLOAD_DIR / safe
    with target.open('xb') as f: f.write(payload)
    sha = hashlib.sha256(payload).hexdigest()
    scan = {'status': 'verified', 'detail': 'File type, signature, structure and integrity verified.'}
    return safe, sha, text, meta, scan, need_ocr


# ---------------- OCR (local, RapidOCR on ONNX Runtime; no external services) ----------------
_ocr_engine=None; _ocr_lock=threading.Lock(); OCR_QUEUE=queue.Queue()


def get_ocr_engine():
    global _ocr_engine
    with _ocr_lock:
        if _ocr_engine is None:
            from rapidocr import RapidOCR
            _ocr_engine=RapidOCR()
    return _ocr_engine


def ocr_image(img):
    """OCR a PIL image. Returns (text, [scores]). Rebuilds reading-order lines from boxes."""
    img=img.convert('RGB'); w,h=img.size
    if max(w,h)>3000: img.thumbnail((3000,3000))
    elif max(w,h)<900: img=img.resize((w*2,h*2))
    buf=BytesIO(); img.save(buf,'PNG')
    out=get_ocr_engine()(buf.getvalue())
    if isinstance(out,tuple): items=[(r[0],r[1],float(r[2])) for r in (out[0] or [])]
    else:
        b=getattr(out,'boxes',None); t=getattr(out,'txts',None) or (); s=getattr(out,'scores',None) or ()
        items=[] if b is None else [(b[i],t[i],float(s[i])) for i in range(len(t))]
    rows=sorted(((min(p[1] for p in bx),max(p[1] for p in bx),min(p[0] for p in bx),tx) for bx,tx,_ in items),key=lambda r:(r[0],r[2]))
    lines=[]
    for top,bot,left,tx in rows:
        mid=(top+bot)/2
        if lines and abs(mid-lines[-1][0])<=max(6,(bot-top)*0.5): lines[-1][1].append((left,tx))
        else: lines.append([mid,[(left,tx)]])
    return '\n'.join(' '.join(t for _,t in sorted(parts)) for _,parts in lines), [s for _,_,s in items]


def ocr_document(fp, ext):
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS=120_000_000
    t0=time.time(); scores=[]; pages=[]; done=0
    if ext=='.pdf':
        import pypdfium2 as pdfium
        try: native,_=pdf_page_texts(str(fp)); native=native or []
        except Exception: native=[]
        pdf=pdfium.PdfDocument(str(fp))
        try:
            total=len(pdf); native+=['']*(total-len(native))
            for i in range(total):
                if len(native[i].strip())>=OCR_MIN_CHARS_PER_PAGE or done>=OCR_MAX_PAGES: pages.append(native[i].strip()); continue
                page=pdf[i]; pw,ph=page.get_size(); scale=min(200/72,3000/max(pw,ph,1))
                img=page.render(scale=scale).to_pil(); page.close()
                t,s=ocr_image(img); scores+=s; done+=1
                pages.append(t if len(t.strip())>len(native[i].strip()) else native[i].strip())
        finally: pdf.close()
    else:
        with Image.open(fp) as im:
            total=int(getattr(im,'n_frames',1) or 1)
            for i in range(min(total,OCR_MAX_PAGES)):
                im.seek(i); t,s=ocr_image(ImageOps.exif_transpose(im.copy())); scores+=s; done+=1; pages.append(t)
    info={'engine':'RapidOCR (ONNX Runtime)','pages_ocr':done,'pages_total':total,'confidence':round(sum(scores)/len(scores),3) if scores else None,'seconds':round(time.time()-t0,1)}
    if total>OCR_MAX_PAGES and done>=OCR_MAX_PAGES: info['note']='OCR was limited to %d pages.' % OCR_MAX_PAGES
    return '\n\n'.join(p for p in pages), info


def process_ocr(doc_id):
    c=db(); r=c.execute('SELECT id,user_id,name,storage_name,extracted_text,metadata_json FROM documents WHERE id=?',(doc_id,)).fetchone(); c.close()
    if not r or not r['storage_name']: return
    meta=json.loads(r['metadata_json'] or '{}'); ext=Path(r['name']).suffix.lower(); fp=UPLOAD_DIR/r['storage_name']; text=r['extracted_text'] or ''
    try:
        if not fp.exists(): raise FileNotFoundError('stored file is missing')
        got,info=ocr_document(fp,ext); info['status']='done'; meta['ocr']=info
        if len(got.strip())>=len(text.strip()): text=got
        if text.strip():
            meta.pop('extraction',None); meta['text_source']='ocr' if ext!='.pdf' or info['pages_ocr']>=info['pages_total'] else 'native+ocr'
        else: meta['extraction']='OCR finished but no readable text was found.'
        event,detail='OCR completed','%d characters recognised from %d page(s) in %ss.' % (len(text),info['pages_ocr'],info['seconds'])
    except ImportError as e:
        meta['ocr']={'status':'unavailable','detail':str(e)[:160]}; meta['extraction']='OCR is unavailable on this server (install requirements.txt).'; event,detail='OCR unavailable',str(e)[:160]
    except Exception as e:
        meta['ocr']={'status':'failed','detail':str(e)[:200]}; meta['extraction']='OCR failed: '+str(e)[:160]; event,detail='OCR failed',str(e)[:160]
    meta['chars']=len(text); meta['words']=len(text.split())
    c=db(); now=now_iso()
    cur=c.execute("UPDATE documents SET status='ready',extracted_text=?,metadata_json=?,updated_at=? WHERE id=?",(text,json.dumps(meta),now,doc_id))
    if cur.rowcount: c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(r['user_id'],event,r['name'],detail,now))
    c.commit(); c.close()


def ocr_worker():
    while True:
        doc_id=OCR_QUEUE.get()
        try: process_ocr(doc_id)
        except Exception:
            traceback.print_exc()
            try: c=db(); c.execute("UPDATE documents SET status='ready' WHERE id=? AND status='processing'",(doc_id,)); c.commit(); c.close()
            except Exception: pass
        finally: OCR_QUEUE.task_done()


DOC_COLS='id,name,type,size,pages,mime,status,archived,security,analysis,sha256,metadata_json,scan_json,analysis_json,created_at,updated_at,length(extracted_text) AS chars'
def doc_out(row):
    d=dict(row); d['metadata']=json.loads(d.pop('metadata_json') or '{}'); d['scan']=json.loads(d.pop('scan_json') or '{}')
    aj = d.pop('analysis_json', None)
    d['content'] = json.loads(aj) if aj else None
    return d


def parse_multipart(handler):
    ctype=handler.headers.get('Content-Type','')
    if 'multipart/form-data' not in ctype or 'boundary=' not in ctype: raise ValueError('Expected multipart/form-data upload.')
    boundary=ctype.split('boundary=',1)[1].strip().strip('"').encode()
    length=int(handler.headers.get('Content-Length','0') or 0)
    if length<=0 or length>MAX_UPLOAD+2*1024*1024: raise ValueError('Upload is missing or too large.')
    raw=handler.rfile.read(length)
    fields={}
    for chunk in raw.split(b'--'+boundary):
        chunk=chunk.strip(b'\r\n-')
        if not chunk or b'\r\n\r\n' not in chunk: continue
        head,body=chunk.split(b'\r\n\r\n',1)
        headers=head.decode('utf-8','replace').split('\r\n')
        disp=next((x for x in headers if x.lower().startswith('content-disposition:')), '')
        name=None; filename=None
        for part in disp.split(';')[1:]:
            k,sep,v=part.strip().partition('=')
            if not sep: continue
            v=v.strip().strip('"')
            if k=='name': name=v
            elif k=='filename': filename=v
        body=body.rstrip(b'\r\n')
        if name=='file':
            mime='application/octet-stream'
            for h in headers:
                if h.lower().startswith('content-type:'): mime=h.split(':',1)[1].strip()
            fields['file']=(Path(filename or 'upload').name,body,mime)
        elif name: fields[name]=body.decode('utf-8','replace')
    if 'file' not in fields: raise ValueError('No file was uploaded.')
    return fields


class Handler(SimpleHTTPRequestHandler):
    server_version = 'JURISAI/0.1'
    protocol_version = 'HTTP/1.1'
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self, fmt,*args): print('%s - %s' % (self.address_string(), fmt % args))
    def send_json(self, status, payload, cookies=None):
        raw = json.dumps(payload, separators=(',',':')).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-store')
        for cookie in cookies or []: self.send_header('Set-Cookie',cookie)
        self.end_headers(); self.wfile.write(raw)
    def fail(self,status,msg,field=None):
        p={'ok':False,'error':msg};
        if field: p['field']=field
        self.send_json(status,p)
    def safe(self,fn,path):
        try: fn(path)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError): self.close_connection=True
        except Exception:
            traceback.print_exc(); self.close_connection=True
            try: self.fail(500,'The server could not complete this request. Please try again.')
            except Exception: pass
    def auth_required(self):
        u=session_user(self)
        if not u: self.fail(401,'Authentication required.'); return None
        return u
    def new_session(self,user_id):
        sid=secrets.token_urlsafe(32); exp=int(time.time())+60*60*24*30; c=db(); c.execute('INSERT INTO sessions(id,user_id,created_at,expires_at) VALUES(?,?,?,?)',(sid,user_id,now_iso(),exp)); c.commit(); c.close()
        return 'jurisai_session=%s; Max-Age=%d; Path=/; HttpOnly; SameSite=Lax%s' % (sid,60*60*24*30,'; Secure' if not DEV else '')
    def clear_session(self):
        raw=self.headers.get('Cookie',''); jar=http.cookies.SimpleCookie(); jar.load(raw); sid=jar.get('jurisai_session')
        if sid:
            c=db(); c.execute('DELETE FROM sessions WHERE id=?',(sid.value,)); c.commit(); c.close()
        return 'jurisai_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax%s' % ('; Secure' if not DEV else '')

    def do_GET(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.safe(self.api_get,path); return
        if path == '/': self.path='/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.headers.get('Expect','').lower() == '100-continue':
            self.send_response_only(100); self.end_headers()
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.safe(self.api_post,path); return
        self.send_error(404)

    def do_PATCH(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.safe(self.api_patch,path); return
        self.send_error(404)

    def do_DELETE(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.safe(self.api_delete,path); return
        self.send_error(404)

    def api_get(self,path):
        if path == '/api/health': return self.send_json(200,{'ok':True,'service':'jurisai','time':now_iso()})
        if path == '/api/auth/me':
            u=session_user(self); return self.send_json(200,{'ok':True,'authenticated':bool(u),'user':public_user(u) if u else None})
        u=self.auth_required()
        if not u:return
        c=db()
        if path == '/api/settings':
            r=c.execute('SELECT payload FROM settings WHERE user_id=?',(u['id'],)).fetchone(); c.close(); return self.send_json(200,{'ok':True,'settings':json.loads(r['payload']) if r else {}})
        if path == '/api/activity':
            rows=c.execute('SELECT id,event,object_name,detail,created_at FROM activity WHERE user_id=? ORDER BY id DESC LIMIT 100',(u['id'],)).fetchall(); c.close(); return self.send_json(200,{'ok':True,'activity':[dict(r) for r in rows]})
        if path == '/api/notifications':
            rows=c.execute('SELECT id,kind,title,text,read,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50',(u['id'],)).fetchall(); c.close(); return self.send_json(200,{'ok':True,'notifications':[dict(r) for r in rows]})
        if path == '/api/documents':
            rows=c.execute('SELECT '+DOC_COLS+' FROM documents WHERE user_id=? ORDER BY created_at DESC',(u['id'],)).fetchall(); c.close()
            return self.send_json(200,{'ok':True,'documents':[doc_out(r) for r in rows]})
        if path == '/api/findings':
            rows=c.execute("SELECT id, name, analysis_json FROM documents WHERE user_id=? AND analysis='analyzed' AND analysis_json IS NOT NULL AND archived=0",(u['id'],)).fetchall(); c.close()
            from analyzer import compare_documents
            all_findings = []
            docs = [{'id': r['id'], 'name': r['name'], 'content': json.loads(r['analysis_json'])} for r in rows if r['analysis_json']]
            for i in range(len(docs)):
                for j in range(i + 1, len(docs)):
                    all_findings.extend(compare_documents(docs[i], docs[j]))
            return self.send_json(200, {'ok': True, 'findings': all_findings})
        if path == '/api/legislation/status':
            c.close()
            from uk_legislation import uk_client
            return self.send_json(200, {'ok': True, 'status': uk_client.get_api_status()})
        if path == '/api/legislation/search':
            c.close()
            from urllib.parse import parse_qs
            parsed_url = urlparse(self.path); q_params = parse_qs(parsed_url.query)
            q = q_params.get('q', [''])[0]
            from uk_legislation import uk_client
            results = uk_client.query_legislation(q.split() if q else ['contract'], max_matches=6)
            return self.send_json(200, {'ok': True, 'query': q, 'results': results})
        if path == '/api/compliance':
            rows = c.execute("SELECT id, name, sha256, analysis_json FROM documents WHERE user_id=? AND analysis='analyzed' AND analysis_json IS NOT NULL AND archived=0", (u['id'],)).fetchall()
            rev_rows = c.execute("SELECT * FROM reviews WHERE user_id=?", (u['id'],)).fetchall()
            rev_map = {r['finding_id']: dict(r) for r in rev_rows}
            c.close()
            all_comp = []
            for r in rows:
                if not r['analysis_json']: continue
                content = json.loads(r['analysis_json'])
                comp = content.get('compliance', [])
                for item in comp:
                    item_copy = dict(item)
                    if item_copy['id'] in rev_map:
                        item_copy['review'] = rev_map[item_copy['id']]
                        item_copy['review_status'] = rev_map[item_copy['id']]['status']
                    all_comp.append(item_copy)
            return self.send_json(200, {'ok': True, 'compliance': all_comp})
        if path == '/api/timeline':
            rows = c.execute("SELECT id, name, analysis_json FROM documents WHERE user_id=? AND analysis='analyzed' AND analysis_json IS NOT NULL AND archived=0", (u['id'],)).fetchall(); c.close()
            timeline_items = []
            for r in rows:
                if not r['analysis_json']: continue
                content = json.loads(r['analysis_json'])
                for d in content.get('dates', []):
                    timeline_items.append({
                        'doc_id': r['id'],
                        'doc_name': r['name'],
                        'text': d.get('text', ''),
                        'label': d.get('label', ''),
                        'ref': d.get('ref', ''),
                        'iso': d.get('iso')
                    })
            timeline_items.sort(key=lambda x: (0 if x['iso'] else 1, x['iso'] or x['text']))
            return self.send_json(200, {'ok': True, 'timeline': timeline_items})
        if path == '/api/dashboard/stats':
            rows = c.execute("SELECT id, name, analysis_json FROM documents WHERE user_id=? AND analysis='analyzed' AND analysis_json IS NOT NULL AND archived=0", (u['id'],)).fetchall()
            rev_rows = c.execute("SELECT * FROM reviews WHERE user_id=?", (u['id'],)).fetchall()
            c.close()
            from analyzer import compare_documents
            all_findings = []
            docs = [{'id': r['id'], 'name': r['name'], 'content': json.loads(r['analysis_json'])} for r in rows if r['analysis_json']]
            for i in range(len(docs)):
                for j in range(i + 1, len(docs)):
                    all_findings.extend(compare_documents(docs[i], docs[j]))
            
            total_compliance = 0
            statutory_breaches = 0
            human_reviews_needed = 0
            statutes_breakdown = {}
            for d in docs:
                for c_item in d['content'].get('compliance', []):
                    total_compliance += 1
                    if c_item.get('status') == 'statutory_breach': statutory_breaches += 1
                    if c_item.get('status') in ['human_review', 'potential_risk']: human_reviews_needed += 1
                    s_name = c_item.get('statute', {}).get('short_title', 'General Statute')
                    statutes_breakdown[s_name] = statutes_breakdown.get(s_name, 0) + 1
            
            from uk_legislation import uk_client
            api_status = uk_client.get_api_status()

            return self.send_json(200, {
                'ok': True,
                'total_documents': len(docs),
                'total_findings': len(all_findings),
                'total_compliance_checks': total_compliance,
                'statutory_breaches': statutory_breaches,
                'human_reviews_needed': human_reviews_needed,
                'human_reviews_completed': len([r for r in rev_rows if r['status'] != 'pending']),
                'statutes_breakdown': statutes_breakdown,
                'api_status': api_status
            })
        if path == '/api/reviews':
            rows = c.execute("SELECT * FROM reviews WHERE user_id=? ORDER BY updated_at DESC", (u['id'],)).fetchall()
            c.close()
            return self.send_json(200, {'ok': True, 'reviews': [dict(r) for r in rows]})
        if path.startswith('/api/reports/audit'):
            from urllib.parse import parse_qs
            parsed_url = urlparse(self.path); q_params = parse_qs(parsed_url.query)
            doc_id = q_params.get('doc_id', [None])[0]
            if doc_id:
                doc_rows = c.execute("SELECT * FROM documents WHERE id=? AND user_id=?", (doc_id, u['id'])).fetchall()
            else:
                doc_rows = c.execute("SELECT * FROM documents WHERE user_id=? AND analysis='analyzed' AND archived=0", (u['id'],)).fetchall()
            rev_rows = c.execute("SELECT * FROM reviews WHERE user_id=?", (u['id'],)).fetchall()
            c.close()
            rev_map = {r['finding_id']: dict(r) for r in rev_rows}
            audit_report = {
                'title': 'Explainable Audit-Ready Legal Compliance Report',
                'generated_at': now_iso(),
                'user': public_user(u),
                'documents': []
            }
            for d in doc_rows:
                content = json.loads(d['analysis_json']) if d['analysis_json'] else {}
                comp_items = []
                for comp in content.get('compliance', []):
                    c_dict = dict(comp)
                    if c_dict['id'] in rev_map:
                        c_dict['human_decision'] = rev_map[c_dict['id']]
                    comp_items.append(c_dict)
                audit_report['documents'].append({
                    'id': d['id'],
                    'name': d['name'],
                    'sha256': d['sha256'],
                    'verified_at': d['updated_at'],
                    'summary': content.get('summary', ''),
                    'compliance_findings': comp_items,
                    'issues': content.get('issues', []),
                    'dates': content.get('dates', [])
                })
            return self.send_json(200, {'ok': True, 'report': audit_report})
        parts=path.strip('/').split('/')
        if len(parts)==3 and parts[1]=='documents':
            r=c.execute('SELECT '+DOC_COLS+' FROM documents WHERE id=? AND user_id=?',(parts[2],u['id'])).fetchone(); c.close()
            if not r: return self.fail(404,'Document not found.')
            return self.send_json(200,{'ok':True,'document':doc_out(r)})
        if len(parts)==4 and parts[1]=='documents' and parts[3]=='text':
            r=c.execute('SELECT name,status,extracted_text,metadata_json FROM documents WHERE id=? AND user_id=?',(parts[2],u['id'])).fetchone(); c.close()
            if not r: return self.fail(404,'Document not found.')
            return self.send_json(200,{'ok':True,'status':r['status'],'text':r['extracted_text'] or '','metadata':json.loads(r['metadata_json'] or '{}')})
        if path.startswith('/api/documents/') and (path.endswith('/download') or path.endswith('/view')):
            doc_id=path.split('/')[3]; view=path.endswith('/view'); r=c.execute('SELECT * FROM documents WHERE id=? AND user_id=?',(doc_id,u['id'])).fetchone(); c.close()
            if not r: return self.fail(404,'Document not found.')
            if not r['storage_name']: return self.fail(404,'File content is unavailable.')
            fp=UPLOAD_DIR / r['storage_name']
            if not fp.exists(): return self.fail(404,'Stored file is unavailable.')
            data=fp.read_bytes(); ext=Path(r['name']).suffix.lower()
            header_name=re.sub(r'[^A-Za-z0-9._ -]','_',r['name']).replace('"','_')
            if view and ext in ('.tif','.tiff'):
                try:
                    from PIL import Image, ImageOps
                    with Image.open(BytesIO(data)) as im:
                        im.seek(0); prev=ImageOps.exif_transpose(im.copy()).convert('RGB'); prev.thumbnail((2400,2400)); buf=BytesIO(); prev.save(buf,'PNG'); data=buf.getvalue()
                    self.send_response(200); self.send_header('Content-Type','image/png'); self.send_header('Content-Length',str(len(data))); self.send_header('Content-Disposition','inline; filename="%s.png"' % header_name); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Cache-Control','private, max-age=300'); self.end_headers(); self.wfile.write(data); return
                except Exception: pass
            if view and ext in ('.pdf','.png','.jpg','.jpeg'):
                self.send_response(200); self.send_header('Content-Type',MIME_BY_EXT[ext]); self.send_header('Content-Length',str(len(data))); self.send_header('Content-Disposition','inline; filename="%s"' % header_name); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Cache-Control','private, max-age=300'); self.end_headers(); self.wfile.write(data); return
            if view:
                html=htmllib
                content=r['extracted_text'] or 'No text could be extracted from this file. The original file is still available to download.'
                meta=json.loads(r['metadata_json'] or '{}'); detail=' · '.join([html.escape(r['name']),html.escape(str(meta.get('bytes',r['size']))+' bytes'),html.escape('SHA-256 '+str(r['sha256'] or ''))])
                page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+html.escape(r['name'])+' — JURISAI</title><style>body{margin:0;background:#f3f0e8;color:#1f2937;font:16px/1.7 system-ui}header{position:sticky;top:0;background:#10213a;color:white;padding:18px 7vw}header h1{margin:0;font-size:20px}header small{opacity:.75}main{max-width:900px;margin:36px auto;padding:48px;background:white;box-shadow:0 4px 28px #15203018;white-space:pre-wrap;overflow-wrap:anywhere}a{color:inherit}</style><header><h1>'+html.escape(r['name'])+'</h1><small>'+detail+'</small> · <a href="/api/documents/'+html.escape(doc_id)+'/download">Download original</a></header><main>'+html.escape(content)+'</main></html>'
                raw=page.encode('utf-8'); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"); self.end_headers(); self.wfile.write(raw); return
            self.send_response(200); self.send_header('Content-Type',r['mime'] or 'application/octet-stream'); self.send_header('Content-Length',str(len(data))); self.send_header('Content-Disposition','attachment; filename="%s"' % header_name); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data); return
        self.fail(404,'Endpoint not found.')

    def api_post(self,path):
        data={} if path == '/api/documents/upload' else json_body(self)
        if path == '/api/documents/upload': self.close_connection=True
        if path == '/api/auth/register':
            name=str(data.get('name','')).strip(); email=norm_email(data.get('email')); pw=str(data.get('password',''))
            if len(name)<2:return self.fail(400,'Enter a valid name.','name')
            if '@' not in email:return self.fail(400,'Enter a valid email address.','email')
            if len(pw)<10:return self.fail(400,'Password must be at least 10 characters.','password')
            c=db();
            if c.execute('SELECT 1 FROM users WHERE email=?',(email,)).fetchone(): c.close(); return self.fail(409,'That email is already registered.','email')
            uidv=uid(); ts=now_iso(); c.execute('INSERT INTO users(id,name,email,password_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)',(uidv,name,email,hash_password(pw),ts,ts)); seed_defaults(c,uidv); code=f'{secrets.randbelow(1000000):06d}'; c.execute('INSERT OR REPLACE INTO verification_codes(email,code,expires_at) VALUES(?,?,?)',(email,code,int(time.time())+900)); c.commit(); c.close()
            out={'ok':True,'email':email,'message':'Verification code generated.'};
            if DEV: out['devVerificationCode']=code
            return self.send_json(201,out)
        if path == '/api/auth/resend-verification':
            email=norm_email(data.get('email')); c=db(); u=c.execute('SELECT id FROM users WHERE email=? AND verified=0',(email,)).fetchone()
            if not u: c.close(); return self.send_json(200,{'ok':True})
            code=f'{secrets.randbelow(1000000):06d}'; c.execute('INSERT OR REPLACE INTO verification_codes(email,code,expires_at) VALUES(?,?,?)',(email,code,int(time.time())+900)); c.commit(); c.close(); out={'ok':True};
            if DEV: out['devVerificationCode']=code
            return self.send_json(200,out)
        if path == '/api/auth/verify':
            email=norm_email(data.get('email')); code=str(data.get('code','')).strip(); c=db(); row=c.execute('SELECT * FROM verification_codes WHERE email=? AND code=? AND expires_at>?',(email,code,int(time.time()))).fetchone();
            if not row: c.close(); return self.fail(400,'That verification code is invalid or expired.')
            u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone(); c.execute('UPDATE users SET verified=1,updated_at=? WHERE id=?',(now_iso(),u['id'])); c.execute('DELETE FROM verification_codes WHERE email=?',(email,)); c.commit(); c.close(); cookie=self.new_session(u['id']); c=db(); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Signed in','Account','Email verified and session created.',now_iso())); c.commit(); c.close(); return self.send_json(200,{'ok':True,'user':public_user(u)},[cookie])
        if path == '/api/auth/login':
            email=norm_email(data.get('email')); pw=str(data.get('password','')); c=db(); u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone();
            if not u or not check_password(pw,u['password_hash']): c.close(); return self.fail(401,'We couldn’t sign you in. Check your email and password.')
            if not u['verified']:
                c.close(); return self.fail(403,'Please verify your email before signing in.','email')
            c.close(); cookie=self.new_session(u['id']); c=db(); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Signed in','Account','Password authentication succeeded.',now_iso())); c.commit(); c.close(); return self.send_json(200,{'ok':True,'user':public_user(u)},[cookie])
        if path == '/api/auth/logout':
            return self.send_json(200,{'ok':True},[self.clear_session()])
        if path == '/api/auth/request-reset':
            email=norm_email(data.get('email')); c=db(); u2=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone()
            if not u2: c.close(); return self.send_json(200,{'ok':True,'message':'If that account exists, a reset code has been issued.'})
            code=f'{secrets.randbelow(1000000):06d}'; c.execute('INSERT OR REPLACE INTO verification_codes(email,code,expires_at) VALUES(?,?,?)',(email,'reset:'+code,int(time.time())+900)); c.commit(); c.close(); out={'ok':True,'message':'If that account exists, a reset code has been issued.'};
            if DEV: out['devResetCode']=code
            return self.send_json(200,out)
        if path == '/api/auth/reset-password':
            email=norm_email(data.get('email')); code=str(data.get('code','')).strip(); pw=str(data.get('password',''))
            if len(pw)<10: return self.fail(400,'Password must be at least 10 characters.','password')
            c=db(); row=c.execute("SELECT * FROM verification_codes WHERE email=? AND code=? AND expires_at>?",(email,'reset:'+code,int(time.time()))).fetchone()
            if not row: c.close(); return self.fail(400,'That reset code is invalid or expired.')
            u2=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone(); c.execute('UPDATE users SET password_hash=?,updated_at=? WHERE id=?',(hash_password(pw),now_iso(),u2['id'])); c.execute('DELETE FROM verification_codes WHERE email=?',(email,)); c.execute('DELETE FROM sessions WHERE user_id=?',(u2['id'],)); c.commit(); c.close(); return self.send_json(200,{'ok':True})
        if path == '/api/auth/change-password':
            u=self.auth_required();
            if not u:return
            old=str(data.get('currentPassword','')); new=str(data.get('newPassword',''))
            if len(new)<10:return self.fail(400,'New password must be at least 10 characters.','password')
            if not check_password(old,u['password_hash']):return self.fail(401,'Current password is incorrect.','currentPassword')
            c=db(); c.execute('UPDATE users SET password_hash=?,updated_at=? WHERE id=?',(hash_password(new),now_iso(),u['id'])); c.execute('DELETE FROM sessions WHERE user_id=?',(u['id'],)); c.commit(); c.close(); cookie=self.new_session(u['id']); return self.send_json(200,{'ok':True},[cookie])
        u=self.auth_required()
        if not u:return
        if path == '/api/invitations':
            email=norm_email(data.get('email'))
            if '@' not in email:return self.fail(400,'Enter a valid email address.','email')
            token=secrets.token_urlsafe(32); iid=uid('inv'); c=db(); c.execute('INSERT INTO invitations(id,user_id,email,token,created_at,expires_at) VALUES(?,?,?,?,?,?)',(iid,u['id'],email,token,now_iso(),int(time.time())+7*86400)); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Invitation created',email,'Invitation expires in 7 days.',now_iso())); c.commit(); c.close(); out={'ok':True,'email':email};
            if DEV: out['devInvitationToken']=token
            return self.send_json(201,out)
        if path == '/api/documents/upload':
            try:
                filename=re.sub(r'[\x00-\x1f\x7f]','',Path(unquote(self.headers.get('X-Filename','upload')).replace('\\','/')).name).strip()[:200] or 'upload'
                mime=self.headers.get('Content-Type','application/octet-stream')
                length=int(self.headers.get('Content-Length','0') or 0)
                if length<=0: raise ValueError('Upload is empty.')
                if length>MAX_UPLOAD:
                    left=min(length,512*1024*1024)
                    while left>0:
                        got=self.rfile.read(min(left,1<<20))
                        if not got: break
                        left-=len(got)
                    raise ValueError('Files must be 50 MB or smaller.')
                payload=self.rfile.read(length)
                if len(payload)!=length: raise ValueError('Upload was incomplete.')
                storage,sha,extracted,metadata,scan,need_ocr=save_upload(u['id'],filename,payload,mime)
            except ValueError as e:
                self.close_connection=True; return self.fail(400,str(e))
            ext=Path(filename).suffix.lower(); typ=MIME_BY_EXT[ext]; now=now_iso(); did=uid('doc'); pages=int(metadata.get('pages') or 0)
            c=db(); dup=c.execute('SELECT id,name FROM documents WHERE user_id=? AND sha256=? ORDER BY created_at LIMIT 1',(u['id'],sha)).fetchone()
            if dup: metadata['duplicate_of']={'id':dup['id'],'name':dup['name']}
            status='processing' if need_ocr else 'ready'
            c.execute('INSERT INTO documents(id,user_id,name,type,size,pages,mime,status,archived,security,analysis,sha256,storage_name,extracted_text,metadata_json,scan_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(did,u['id'],filename,typ,len(payload),pages,typ,status,0,'checked','not_started',sha,storage,extracted,json.dumps(metadata),json.dumps(scan),now,now)); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Document uploaded',filename,'File type, signature, structure, and SHA-256 verified.'+(' OCR queued.' if need_ocr else '')+(' Identical to "'+dup['name']+'".' if dup else ''),now)); c.commit(); r=c.execute('SELECT '+DOC_COLS+' FROM documents WHERE id=?',(did,)).fetchone(); c.close()
            if need_ocr: OCR_QUEUE.put(did)
            return self.send_json(201,{'ok':True,'document':doc_out(r)})
        if path == '/api/activity':
            c=db(); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],str(data.get('event','Activity')),str(data.get('object','')),str(data.get('detail','')),now_iso())); c.commit(); c.close(); return self.send_json(201,{'ok':True})
        if path == '/api/reviews':
            fid = str(data.get('finding_id', '')).strip()
            did = str(data.get('doc_id', '')).strip()
            decision = str(data.get('decision', 'reviewed')).strip()
            notes = str(data.get('notes', '')).strip()
            reviewer = str(data.get('reviewer', u['name'] or 'Legal Reviewer')).strip()
            if not fid: return self.fail(400, 'finding_id is required.')
            now = now_iso()
            rid = uid('rev')
            c = db()
            c.execute("""
                INSERT INTO reviews (id, user_id, finding_id, doc_id, status, decision, notes, reviewer, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status=excluded.status, decision=excluded.decision, notes=excluded.notes,
                    reviewer=excluded.reviewer, updated_at=excluded.updated_at
            """, (rid, u['id'], fid, did, decision, decision, notes, reviewer, now, now))
            c.execute("INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)",
                      (u['id'], f'Human Review: {decision.title()}', fid, f'{decision.title()} by {reviewer}. {notes}', now))
            c.commit()
            row = c.execute("SELECT * FROM reviews WHERE user_id=? AND finding_id=?", (u['id'], fid)).fetchone()
            c.close()
            return self.send_json(200, {'ok': True, 'review': dict(row) if row else {'status': decision}})
        if path == '/api/notifications/read-all':
            c=db(); c.execute('UPDATE notifications SET read=1 WHERE user_id=?',(u['id'],)); c.commit(); c.close(); return self.send_json(200,{'ok':True})
        parts=path.strip('/').split('/')
        if len(parts)==4 and parts[1]=='documents' and parts[3]=='ocr':
            c=db(); r=c.execute('SELECT id,name,status,metadata_json FROM documents WHERE id=? AND user_id=?',(parts[2],u['id'])).fetchone()
            if not r: c.close(); return self.fail(404,'Document not found.')
            ext=Path(r['name']).suffix.lower()
            if ext not in ('.pdf','.png','.jpg','.jpeg','.tif','.tiff'): c.close(); return self.fail(400,'OCR applies to PDFs and images only.')
            meta=json.loads(r['metadata_json'] or '{}')
            if meta.get('encrypted'): c.close(); return self.fail(400,'Password-protected PDFs cannot be processed with OCR.')
            if r['status']!='processing':
                meta['ocr']={'status':'queued'}; meta.pop('extraction',None)
                c.execute("UPDATE documents SET status='processing',metadata_json=?,updated_at=? WHERE id=?",(json.dumps(meta),now_iso(),r['id'])); c.commit(); OCR_QUEUE.put(r['id'])
            r=c.execute('SELECT '+DOC_COLS+' FROM documents WHERE id=?',(parts[2],)).fetchone(); c.close()
            return self.send_json(202,{'ok':True,'document':doc_out(r)})
        if len(parts)==4 and parts[1]=='documents' and parts[3]=='analyze':
            doc_id=parts[2]; c=db()
            r=c.execute("SELECT id,name,sha256,extracted_text,metadata_json FROM documents WHERE id=? AND user_id=?",(doc_id,u['id'])).fetchone()
            if not r: c.close(); return self.fail(404,'Document not found.')
            text=r['extracted_text'] or ''
            if not text.strip(): c.close(); return self.fail(400,'Document contains no extractable text to analyze.')
            from analyzer import screen_security, analyze_document
            sec_scan=screen_security(text,r['name'],r['sha256'] or '')
            sec_status=sec_scan['status']
            user_settings=c.execute("SELECT payload FROM settings WHERE user_id=?",(u['id'],)).fetchone()
            jur='uk'
            if user_settings:
                try: jur=json.loads(user_settings['payload']).get('jur','uk')
                except Exception: pass
            content=analyze_document(text,doc_id,r['name'],jur)
            scan_dict={'status':sec_status,'detail':sec_scan['detail'],'checks':sec_scan['checks']}
            now=now_iso()
            c.execute("UPDATE documents SET analysis='analyzed',security=?,scan_json=?,analysis_json=?,updated_at=? WHERE id=?",(sec_status,json.dumps(scan_dict),json.dumps(content),now,doc_id))
            c.execute("INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)",(u['id'],'Document analyzed',r['name'],'Automated clause extraction and legal risk analysis completed.',now))
            c.execute("INSERT INTO notifications(user_id,kind,title,text,read,created_at) VALUES(?,?,?,?,?,?)",(u['id'],'system','Legal analysis ready',f"Analysis for {r['name']} is ready to view.",0,now))
            c.commit()
            out_row=c.execute('SELECT '+DOC_COLS+' FROM documents WHERE id=?',(doc_id,)).fetchone(); c.close()
            return self.send_json(200,{'ok':True,'content':content,'document':doc_out(out_row)})
        if len(parts)==4 and parts[1]=='documents' and parts[3]=='law':
            doc_id=parts[2]
            from urllib.parse import parse_qs
            parsed_url=urlparse(self.path); q_params=parse_qs(parsed_url.query)
            clause_ref=q_params.get('c',['1.1'])[0]; jur=q_params.get('jur',['uk'])[0]
            c=db()
            r=c.execute("SELECT id,name,analysis_json,extracted_text FROM documents WHERE id=? AND user_id=?",(doc_id,u['id'])).fetchone()
            if not r: c.close(); return self.fail(404,'Document not found.')
            content=None
            if r['analysis_json']:
                try: content=json.loads(r['analysis_json'])
                except Exception: pass
            if not content:
                from analyzer import analyze_document
                content=analyze_document(r['extracted_text'] or '',doc_id,r['name'],jur)
                now=now_iso()
                c.execute("UPDATE documents SET analysis='analyzed',analysis_json=?,updated_at=? WHERE id=?",(json.dumps(content),now,doc_id))
                c.commit()
            c.close()
            from analyzer import get_legal_context_for_clause
            lc=get_legal_context_for_clause(content,clause_ref,jur)
            return self.send_json(200,{'ok':True,'concept':lc['concept'],'law':lc['law']})

        self.fail(404,'Endpoint not found.')

    def api_patch(self,path):
        u=self.auth_required()
        if not u:return
        data=json_body(self); c=db()
        if path.startswith('/api/documents/') and path.endswith('/archive'):
            doc_id=path.split('/')[3]; archived=bool(data.get('archived')); r=c.execute('SELECT name FROM documents WHERE id=? AND user_id=?',(doc_id,u['id'])).fetchone()
            if not r: c.close(); return self.fail(404,'Document not found.')
            c.execute('UPDATE documents SET archived=?,updated_at=? WHERE id=? AND user_id=?',(1 if archived else 0,now_iso(),doc_id,u['id'])); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Document archived' if archived else 'Document restored',r['name'],'Library status changed.',now_iso())); c.commit(); c.close(); return self.send_json(200,{'ok':True,'archived':archived})
        if path == '/api/me':
            allowed={'name','email','role','org'}; updates={k:str(v).strip() for k,v in data.items() if k in allowed}
            if 'email' in updates:
                if '@' not in updates['email']: c.close(); return self.fail(400,'Enter a valid email address.','email')
                hit=c.execute('SELECT 1 FROM users WHERE email=? AND id<>?',(norm_email(updates['email']),u['id'])).fetchone()
                if hit: c.close(); return self.fail(409,'That email is already used by another account.','email')
                updates['email']=norm_email(updates['email'])
            if updates:
                sets=', '.join(k+'=?' for k in updates); vals=list(updates.values())+[now_iso(),u['id']]; c.execute('UPDATE users SET '+sets+', updated_at=? WHERE id=?',vals)
            r=c.execute('SELECT * FROM users WHERE id=?',(u['id'],)).fetchone(); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Profile updated','Account','Profile details changed.',now_iso())); c.commit(); c.close(); return self.send_json(200,{'ok':True,'user':public_user(r)})
        if path == '/api/settings':
            r=c.execute('SELECT payload FROM settings WHERE user_id=?',(u['id'],)).fetchone(); current=json.loads(r['payload']) if r else {}; current.update(data if isinstance(data,dict) else {}); c.execute('INSERT INTO settings(user_id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',(u['id'],json.dumps(current),now_iso())); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Settings updated','Preferences','Workspace preferences changed.',now_iso())); c.commit(); c.close(); return self.send_json(200,{'ok':True,'settings':current})
        self.fail(404,'Endpoint not found.')

    def api_delete(self,path):
        u=self.auth_required()
        if not u:return
        if path == '/api/account':
            c=db(); rows=c.execute('SELECT storage_name FROM documents WHERE user_id=?',(u['id'],)).fetchall()
            for row in rows:
                if row['storage_name']:
                    try: (UPLOAD_DIR / row['storage_name']).unlink(missing_ok=True)
                    except Exception: pass
            c.execute('DELETE FROM users WHERE id=?',(u['id'],)); c.commit(); c.close(); return self.send_json(200,{'ok':True},[self.clear_session()])
        if path.startswith('/api/documents/'):
            doc_id=path.rsplit('/',1)[-1]; c=db(); r=c.execute('SELECT * FROM documents WHERE id=? AND user_id=?',(doc_id,u['id'])).fetchone();
            if not r: c.close(); return self.fail(404,'Document not found.')
            
            if r['storage_name']:
                try: (UPLOAD_DIR / r['storage_name']).unlink(missing_ok=True)
                except Exception: pass
            c.execute('DELETE FROM documents WHERE id=?',(doc_id,)); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Document deleted',r['name'],'Document removed from workspace.',now_iso())); c.commit(); c.close(); return self.send_json(200,{'ok':True})
        self.fail(404,'Endpoint not found.')


def main():
    init_db(); print(f'JURISAI server: http://{HOST}:{PORT}'); print(f'Database: {DB_PATH}')
    threading.Thread(target=ocr_worker,name='ocr-worker',daemon=True).start()
    c=db(); pending=[r['id'] for r in c.execute("SELECT id FROM documents WHERE status='processing' ORDER BY created_at").fetchall()]; c.close()
    for did in pending: OCR_QUEUE.put(did)
    if pending: print(f'Resumed OCR for {len(pending)} document(s).')
    ThreadingHTTPServer.daemon_threads=True
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
if __name__ == '__main__': main()