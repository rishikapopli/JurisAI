#!/usr/bin/env python3
import base64, hashlib, hmac, http.cookies, json, mimetypes, os, secrets, socket, sqlite3, sys, time, uuid, zipfile
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
    c = sqlite3.connect(DB_PATH)
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
    CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    ''')
    cols={r['name'] for r in c.execute('PRAGMA table_info(documents)').fetchall()}
    for name, decl in [('extracted_text', "TEXT NOT NULL DEFAULT ''"), ('metadata_json', "TEXT NOT NULL DEFAULT '{}'"), ('scan_json', "TEXT NOT NULL DEFAULT '{}'")]:
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


def save_upload(user_id, filename, payload, mime):
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValueError('This file type is not supported. Upload PDF, DOCX, TXT, PNG, JPG, or TIFF.')
    if len(payload) > MAX_UPLOAD:
        raise ValueError('Files must be 50 MB or smaller.')
    if not payload: raise ValueError('Upload is empty.')
    meta={'extension':ext[1:], 'bytes':len(payload)}; text=''
    if ext=='.pdf':
        if not payload.startswith(b'%PDF-'): raise ValueError('The file does not have a valid PDF signature.')
        if b'%%EOF' not in payload[-2048:]: raise ValueError('The PDF appears incomplete or corrupted.')
        meta['pages']=len(__import__('re').findall(rb'/Type\s*/Page\b',payload))
        try:
            from pypdf import PdfReader
            reader=PdfReader(BytesIO(payload),strict=True)
            if reader.is_encrypted: raise ValueError('Encrypted PDFs are not supported for text extraction.')
            text='\n\n'.join((p.extract_text() or '') for p in reader.pages)
            meta.update({'pages':len(reader.pages),'title':str(reader.metadata.title or '') if reader.metadata else '', 'author':str(reader.metadata.author or '') if reader.metadata else ''})
        except ImportError: meta['extraction']='pypdf is not installed; PDF text extraction unavailable.'
        except ValueError: raise
        except Exception as e: raise ValueError('PDF structure could not be read: '+str(e)[:180])
    elif ext=='.docx':
        if not payload.startswith(b'PK\x03\x04'): raise ValueError('The file does not have a valid DOCX signature.')
        try:
            with zipfile.ZipFile(BytesIO(payload)) as z:
                infos=z.infolist()
                if len(infos)>1000 or sum(x.file_size for x in infos)>200*1024*1024 or any(x.file_size>max(1,x.compress_size)*1000 for x in infos): raise ValueError('DOCX archive expands beyond the supported safety limits.')
                if z.testzip(): raise ValueError('The DOCX archive is damaged.')
                if 'word/document.xml' not in z.namelist(): raise ValueError('The DOCX document body is missing.')
                from xml.etree import ElementTree as ET
                root=ET.fromstring(z.read('word/document.xml')); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                text='\n'.join(''.join(x.itertext()) for x in root.findall('.//w:p',ns))
                if 'docProps/core.xml' in z.namelist():
                    props=ET.fromstring(z.read('docProps/core.xml'))
                    meta['title']=next((e.text or '' for e in props if e.tag.endswith('}title')),'')
                    meta['author']=next((e.text or '' for e in props if e.tag.endswith('}creator')),'')
        except ValueError: raise
        except Exception as e: raise ValueError('DOCX structure could not be read: '+str(e)[:180])
    elif ext=='.txt':
        if b'\x00' in payload: raise ValueError('Text file contains binary data.')
        try: text=payload.decode('utf-8-sig')
        except UnicodeDecodeError: raise ValueError('Text files must use UTF-8 encoding.')
    else:
        valid=(ext=='.png' and payload.startswith(b'\x89PNG\r\n\x1a\n')) or (ext in ('.jpg','.jpeg') and payload.startswith(b'\xff\xd8\xff') and payload.rstrip().endswith(b'\xff\xd9')) or (ext in ('.tif','.tiff') and payload[:4] in (b'II*\x00',b'MM\x00*'))
        if not valid: raise ValueError('The file signature does not match its image extension.')
        meta['extraction']='Image accepted; OCR is not enabled.'
    scan={'engine':'none','status':'not_configured','detail':'No antivirus scanner is configured; only file type, signature, and structure were checked.'}
    host=os.environ.get('JURISAI_CLAMD_HOST')
    if host:
        try:
            with socket.create_connection((host,int(os.environ.get('JURISAI_CLAMD_PORT','3310'))),timeout=8) as s:
                s.settimeout(30); s.sendall(b'zINSTREAM\0')
                for i in range(0,len(payload),65536):
                    part=payload[i:i+65536]; s.sendall(len(part).to_bytes(4,'big')+part)
                s.sendall((0).to_bytes(4,'big')); ans=b''
                while b'\0' not in ans:
                    part=s.recv(4096)
                    if not part: break
                    ans+=part
            ans=ans.decode('utf-8','replace').strip('\0\n ')
            scan={'engine':'clamd','status':'threat_detected' if ' FOUND' in ans else 'clean' if ' OK' in ans else 'error','detail':ans}
        except Exception as e: scan={'engine':'clamd','status':'error','detail':'Configured antivirus scanner unavailable: '+str(e)[:180]}
    if scan['status']=='threat_detected': raise ValueError('The configured antivirus scanner detected a threat; the file was rejected.')
    if scan['status']=='error': raise ValueError('Security scan could not be completed because the configured antivirus scanner is unavailable.')
    safe = secrets.token_hex(16) + ext
    target = UPLOAD_DIR / safe
    with target.open('xb') as f: f.write(payload)
    sha = hashlib.sha256(payload).hexdigest()
    return safe, sha, text, meta, scan


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
            self.api_get(path); return
        if path == '/': self.path='/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.headers.get('Expect','').lower() == '100-continue':
            self.send_response_only(100); self.end_headers()
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.api_post(path); return
        self.send_error(404)

    def do_PATCH(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.api_patch(path); return
        self.send_error(404)

    def do_DELETE(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            self.api_delete(path); return
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
            rows=c.execute('SELECT id,name,type,size,pages,mime,status,archived,security,analysis,sha256,metadata_json,scan_json,created_at,updated_at FROM documents WHERE user_id=? ORDER BY created_at DESC',(u['id'],)).fetchall(); c.close()
            out=[]
            for row in rows:
                d=dict(row); d['metadata']=json.loads(d.pop('metadata_json') or '{}'); d['scan']=json.loads(d.pop('scan_json') or '{}'); out.append(d)
            return self.send_json(200,{'ok':True,'documents':out})
        if path.startswith('/api/documents/') and (path.endswith('/download') or path.endswith('/view')):
            doc_id=path.split('/')[3]; view=path.endswith('/view'); r=c.execute('SELECT * FROM documents WHERE id=? AND user_id=?',(doc_id,u['id'])).fetchone(); c.close()
            if not r: return self.fail(404,'Document not found.')
            if not r['storage_name']: return self.fail(404,'File content is unavailable.')
            fp=UPLOAD_DIR / r['storage_name']
            if not fp.exists(): return self.fail(404,'Stored file is unavailable.')
            data=fp.read_bytes()
            header_name=re.sub(r'[^A-Za-z0-9._ -]','_',r['name']).replace('"','_')
            if view and Path(r['name']).suffix.lower() in ('.pdf','.png','.jpg','.jpeg'):
                self.send_response(200); self.send_header('Content-Type',r['mime'] or 'application/octet-stream'); self.send_header('Content-Length',str(len(data))); self.send_header('Content-Disposition','inline; filename="%s"' % header_name); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data); return
            if view:
                import html
                content=r['extracted_text'] or 'No text could be extracted from this file. The original file is still available to download.'
                meta=json.loads(r['metadata_json'] or '{}'); detail=' · '.join([html.escape(r['name']),html.escape(str(meta.get('bytes',r['size']))+' bytes'),html.escape('SHA-256 '+str(r['sha256'] or ''))])
                page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+html.escape(r['name'])+' — JURISAI</title><style>body{margin:0;background:#f3f0e8;color:#1f2937;font:16px/1.7 system-ui}header{position:sticky;top:0;background:#10213a;color:white;padding:18px 7vw}header h1{margin:0;font-size:20px}header small{opacity:.75}main{max-width:900px;margin:36px auto;padding:48px;background:white;box-shadow:0 4px 28px #15203018;white-space:pre-wrap;overflow-wrap:anywhere}a{color:inherit}</style><header><h1>'+html.escape(r['name'])+'</h1><small>'+detail+'</small> · <a href="/api/documents/'+html.escape(doc_id)+'/download">Download original</a></header><main>'+html.escape(content)+'</main></html>'
                raw=page.encode('utf-8'); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"); self.end_headers(); self.wfile.write(raw); return
            self.send_response(200); self.send_header('Content-Type',r['mime'] or 'application/octet-stream'); self.send_header('Content-Length',str(len(data))); self.send_header('Content-Disposition','attachment; filename="%s"' % header_name); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data); return
        self.fail(404,'Endpoint not found.')

    def api_post(self,path):
        data={} if path == '/api/documents/upload' else json_body(self)
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
                filename=Path(unquote(self.headers.get('X-Filename','upload'))).name
                mime=self.headers.get('Content-Type','application/octet-stream')
                length=int(self.headers.get('Content-Length','0') or 0)
                if length<=0: raise ValueError('Upload is empty.')
                if length>MAX_UPLOAD: raise ValueError('Files must be 50 MB or smaller.')
                payload=self.rfile.read(length)
                if len(payload)!=length: raise ValueError('Upload was incomplete.')
                storage,sha,extracted,metadata,scan=save_upload(u['id'],filename,payload,mime)
            except ValueError as e: return self.fail(400,str(e))
            ext=Path(filename).suffix.lower(); typ=MIME_BY_EXT[ext]; now=now_iso(); did=uid('doc'); pages=int(metadata.get('pages') or 0)
            c=db(); c.execute('INSERT INTO documents(id,user_id,name,type,size,pages,mime,status,archived,security,analysis,sha256,storage_name,extracted_text,metadata_json,scan_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(did,u['id'],filename,typ,len(payload),pages,typ,'ready',0,'checked','not_started',sha,storage,extracted,json.dumps(metadata),json.dumps(scan),now,now)); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],'Document uploaded',filename,'File type, signature, structure, and SHA-256 checked. Antivirus status: '+scan['status']+'.',now)); c.commit(); r=c.execute('SELECT id,name,type,size,pages,mime,status,archived,security,analysis,sha256,created_at,updated_at,metadata_json,scan_json FROM documents WHERE id=?',(did,)).fetchone(); c.close(); doc=dict(r); doc['metadata']=json.loads(doc.pop('metadata_json')); doc['scan']=json.loads(doc.pop('scan_json')); return self.send_json(201,{'ok':True,'document':doc})
        if path == '/api/activity':
            c=db(); c.execute('INSERT INTO activity(user_id,event,object_name,detail,created_at) VALUES(?,?,?,?,?)',(u['id'],str(data.get('event','Activity')),str(data.get('object','')),str(data.get('detail','')),now_iso())); c.commit(); c.close(); return self.send_json(201,{'ok':True})
        if path == '/api/notifications/read-all':
            c=db(); c.execute('UPDATE notifications SET read=1 WHERE user_id=?',(u['id'],)); c.commit(); c.close(); return self.send_json(200,{'ok':True})
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
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
if __name__ == '__main__': main()
