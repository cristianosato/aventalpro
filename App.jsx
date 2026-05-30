import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCZ7CXVVizHC-O65_-59oAFHcwRHekekUQ",
  authDomain:        "aventalpro.firebaseapp.com",
  projectId:         "aventalpro",
  storageBucket:     "aventalpro.firebasestorage.app",
  messagingSenderId: "816535897526",
  appId:             "1:816535897526:web:89bc7aa81b439b66bcad17",
};

const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);
const auth        = getAuth(firebaseApp);

// ── Firestore helpers (substituem window.storage) ────────────────────────────
// Cada documento fica em collection "data", doc = key (products-v1, sales-v1)
// O campo "value" guarda o JSON serializado — mesma estrutura de antes.
async function load(key) {
  try {
    const snap = await getDoc(doc(db, "data", key));
    if (snap.exists()) return JSON.parse(snap.data().value);
    return null;
  } catch(e) { console.error("load error", e); return null; }
}

async function save(key, data) {
  try {
    await setDoc(doc(db, "data", key), { value: JSON.stringify(data) });
  } catch(e) { console.error("save error", e); }
}


const uid     = () => Math.random().toString(36).slice(2, 9);
const fmt     = (n) => new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(n);
const fmtDate = (d) => new Date(d).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });

const CATEGORIES = ["Avental", "Gorro", "Jaleco", "Mascara", "Outro"];
const COLORS     = ["Branco", "Azul", "Verde", "Rosa", "Preto", "Cinza", "Lilas", "Bege", "Vinho", "Amarelo"];
const SIZES      = ["Unico", "PP", "P", "M", "G", "GG", "XGG"];
const COLOR_HEX  = { Branco:"#f5f5f5", Azul:"#4a90d9", Verde:"#4aa87a", Rosa:"#e87a9a", Preto:"#2a2a2a", Cinza:"#8a8a8a", Lilas:"#9a7ace", Bege:"#d4b896", Vinho:"#8b1a1a", Amarelo:"#e8c84a" };
const CAT_ICON   = { Avental:"🥼", Gorro:"🎩", Jaleco:"👔", Mascara:"😷", Outro:"📦" };
const MONTHS_PT  = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function genBarcode(products) {
  const existing = products.map(p => p.barcode).filter(b => /^\d+$/.test(b)).map(Number);
  const max = existing.length ? Math.max(...existing) : 10000000;
  return String(max + 1).padStart(8, "0");
}

let jsBarcodeReady = false;
function loadJsBarcode(cb) {
  if (window.JsBarcode) { jsBarcodeReady = true; cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js";
  s.onload = () => { jsBarcodeReady = true; cb(); };
  document.head.appendChild(s);
}
function BarcodeDisplay({ value, height=56, fontSize=11 }) {
  const ref = useRef();
  const [ready, setReady] = useState(jsBarcodeReady);
  useEffect(() => { if (!ready) loadJsBarcode(() => setReady(true)); }, []);
  useEffect(() => {
    if (!ready || !ref.current || !value) return;
    try { window.JsBarcode(ref.current, value, { format:"CODE128", width:2, height, displayValue:true, fontSize, fontOptions:"bold", font:"monospace", lineColor:"#000", margin:4, background:"transparent" }); }
    catch(e) {}
  }, [ready, value, height, fontSize]);
  if (!value) return <div style={{fontSize:11,color:"#9b9890",textAlign:"center",padding:"8px 0"}}>Sem codigo</div>;
  if (!ready) return <div style={{fontSize:11,color:"#9b9890",textAlign:"center"}}>...</div>;
  return <svg ref={ref} style={{maxWidth:"100%",display:"block",margin:"0 auto"}} />;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f4f0;--surface:#fff;--surface2:#f0eeea;--border:#e0ddd8;
  --ink:#1a1917;--ink2:#6b6860;--ink3:#9b9890;
  --accent:#1a6b5a;--accent-light:#e8f4f0;--accent-btn:#22876f;
  --danger:#c0392b;--danger-light:#fdf0ef;
  --warn:#c07a1a;--warn-light:#fdf5e8;
  --success:#1a7a3a;--success-light:#eaf5ee;
  --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04);
  --radius:12px;--radius-sm:8px;
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh}
.app{max-width:1100px;margin:0 auto;padding:0 16px 90px}
.header{padding:20px 0 8px;display:flex;align-items:center;gap:12px}
.header-logo{width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0}
.header h1{font-size:18px;font-weight:700;letter-spacing:-.3px;line-height:1.2}
.header p{font-size:12px;color:var(--ink2)}
/* nav principal */
.nav{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:4px;margin-bottom:20px;overflow-x:auto}
.nav::-webkit-scrollbar{display:none}
.nav-btn{flex:1;min-width:max-content;padding:8px 12px;border:none;border-radius:var(--radius-sm);background:transparent;color:var(--ink2);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;justify-content:center;white-space:nowrap}
.nav-btn:hover{background:var(--surface2);color:var(--ink)}
.nav-btn.active{background:var(--accent);color:#fff}
/* abas internas de categoria */
.cat-tabs{display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:16px;overflow-x:auto}
.cat-tabs::-webkit-scrollbar{display:none}
.cat-tab{padding:8px 16px;border:none;background:transparent;color:var(--ink2);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:5px}
.cat-tab:hover{color:var(--ink);background:var(--surface2)}
.cat-tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:700}
.cat-tab-count{font-size:11px;background:var(--surface2);border-radius:99px;padding:1px 6px;font-weight:600}
.cat-tab.active .cat-tab-count{background:var(--accent-light);color:var(--accent)}
/* cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)}
.card+.card,.card+.grid,.grid+.card{margin-top:14px}
.card-title{font-size:13px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.grid{display:grid;gap:12px}
.grid-2{grid-template-columns:repeat(2,1fr)}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-4{grid-template-columns:repeat(4,1fr)}
@media(max-width:700px){.grid-4{grid-template-columns:repeat(2,1fr)}.grid-3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.grid-2{grid-template-columns:1fr}}
/* fields */
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:12px;font-weight:600;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px}
.field input,.field select{padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:14px;color:var(--ink);background:var(--surface);transition:border .15s;outline:none;width:100%}
.field input:focus,.field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(26,107,90,.1)}
.field input.scan-focus{border-color:var(--accent);background:var(--accent-light);font-family:'DM Mono',monospace}
/* btns */
.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border:none;border-radius:var(--radius-sm);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
.btn-primary{background:var(--accent-btn);color:#fff}.btn-primary:hover{background:var(--accent)}
.btn-ghost{background:var(--surface2);color:var(--ink);border:1px solid var(--border)}.btn-ghost:hover{background:var(--border)}
.btn-outline{background:transparent;color:var(--accent);border:1.5px solid var(--accent)}.btn-outline:hover{background:var(--accent-light)}
.btn-sm{padding:6px 12px;font-size:12px}
.btn-full{width:100%;justify-content:center}
.btn:disabled{opacity:.4;cursor:not-allowed}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.badge-ok{background:var(--success-light);color:var(--success)}.badge-low{background:var(--warn-light);color:var(--warn)}.badge-out{background:var(--danger-light);color:var(--danger)}
/* tabelas */
.tbl-wrap{overflow-x:auto;margin:0 -2px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 10px;font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--border);white-space:nowrap;background:var(--surface2)}
td{padding:9px 10px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--surface2)}
/* scan */
.scan-zone{border:2px dashed var(--border);border-radius:var(--radius);padding:20px;text-align:center;color:var(--ink2);transition:all .2s;cursor:pointer}
.scan-zone.active{border-color:var(--accent);background:var(--accent-light);color:var(--accent)}
/* cart */
.cart-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.cart-item:last-child{border-bottom:none}
.cart-item-info{flex:1}
.cart-item-name{font-size:13px;font-weight:600}
.cart-item-sub{font-size:11px;color:var(--ink2)}
.cart-item-actions{display:flex;align-items:center;gap:6px}
.qty-btn{width:26px;height:26px;border:1.5px solid var(--border);border-radius:6px;background:var(--surface2);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ink)}
.qty-val{font-size:14px;font-weight:600;min-width:20px;text-align:center}
/* toast */
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:500;z-index:999;animation:toastIn .2s ease;pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
/* modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:flex-end;justify-content:center}
@media(min-width:600px){.modal-bg{align-items:center}}
.modal{background:var(--surface);border-radius:var(--radius) var(--radius) 0 0;padding:24px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto}
@media(min-width:600px){.modal{border-radius:var(--radius)}}
.modal-title{font-size:16px;font-weight:700;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center}
.close-btn{border:none;background:none;cursor:pointer;font-size:22px;color:var(--ink2);line-height:1;padding:0}
/* search */
.search-inp{display:block;padding:9px 12px 9px 36px;border:1.5px solid var(--border);border-radius:var(--radius-sm);width:100%;font-family:inherit;font-size:14px;outline:none;background:var(--surface);color:var(--ink)}
.search-inp:focus{border-color:var(--accent)}
.search-wrap{position:relative}
.search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ink3);font-size:15px;pointer-events:none}
/* misc */
.empty{text-align:center;padding:36px 20px;color:var(--ink2)}
.empty-icon{font-size:38px;margin-bottom:10px}
.mono{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.5px}
.divider{height:1px;background:var(--border);margin:14px 0}
.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.section-head h2{font-size:16px;font-weight:700}
.stock-bar{height:4px;border-radius:99px;background:var(--border);overflow:hidden;margin-top:4px}
.stock-bar-fill{height:100%;border-radius:99px}
.form-row{display:grid;gap:12px;grid-template-columns:1fr 1fr}
@media(max-width:480px){.form-row{grid-template-columns:1fr}}
/* sugestao modelo */
.suggest-list{position:absolute;top:100%;left:0;right:0;z-index:300;background:var(--surface);border:1.5px solid var(--accent);border-top:none;border-radius:0 0 var(--radius-sm) var(--radius-sm);max-height:200px;overflow-y:auto;box-shadow:var(--shadow)}
.suggest-item{padding:9px 12px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px}
.suggest-item:hover{background:var(--accent-light);color:var(--accent)}
.field-relative{position:relative}
/* filtros */
.filters-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}
.filter-select{padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:13px;outline:none;background:var(--surface);color:var(--ink);cursor:pointer}
.filter-select:focus{border-color:var(--accent)}
/* etiquetas */
.label-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:4px}
.label-card{border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:14px;background:var(--surface);position:relative;transition:border .15s}
.label-card.selected{border-color:var(--accent);box-shadow:0 0 0 3px rgba(26,107,90,.15)}
.label-chk{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:5px;border:2px solid var(--border);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;font-weight:700}
.label-chk.on{background:var(--accent);border-color:var(--accent);color:#fff}
.label-name{font-size:13px;font-weight:700;margin-bottom:2px;padding-right:26px}
.label-sub{font-size:11px;color:var(--ink2);margin-bottom:10px}
.label-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
/* PDV */
.pdv-wrap{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}
@media(max-width:900px){.pdv-wrap{grid-template-columns:300px 1fr}}
@media(max-width:680px){.pdv-wrap{grid-template-columns:1fr}}
.pdv-left{display:flex;flex-direction:column;gap:12px}
.pdv-right{display:flex;flex-direction:column;gap:12px;position:sticky;top:8px}
.pdv-location{display:flex;align-items:center;gap:10px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px}
.pdv-location.set{border-color:var(--accent);background:var(--accent-light)}
.pdv-location-icon{font-size:18px;flex-shrink:0}
.pdv-location-body{flex:1;min-width:0}
.pdv-location-label{font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px}
.pdv-location-val{font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pdv-location input{border:none;background:transparent;font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);outline:none;width:100%;min-width:0}
.scan-row{display:flex;gap:8px;align-items:stretch}
.scan-row input{flex:1;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:'DM Mono',monospace;font-size:14px;outline:none;transition:border .15s}
.scan-row input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(26,107,90,.1)}
.scan-row input.scanning{border-color:var(--accent);background:var(--accent-light)}
.scan-indicator{width:42px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--surface2);border:1.5px solid var(--border);cursor:pointer;flex-shrink:0}
.scan-indicator.on{background:var(--accent);border-color:var(--accent)}
.cart-table{width:100%;border-collapse:collapse}
.cart-table th{font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px;padding:6px 8px;border-bottom:2px solid var(--border);text-align:left;background:var(--surface2)}
.cart-table td{padding:8px;border-bottom:1px solid var(--border);vertical-align:middle;font-size:13px}
.cart-table tr:last-child td{border-bottom:none}
.cart-table tr:hover td{background:var(--surface2)}
.summary-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;gap:8px}
.summary-row+.summary-row{border-top:1px solid var(--border)}
.summary-label{font-size:13px;color:var(--ink2);flex-shrink:0}
.summary-val{font-size:13px;font-weight:600;color:var(--ink)}
.summary-total{font-size:16px;font-weight:700;color:var(--accent)}
.inline-input{padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:13px;outline:none;width:100px;text-align:right;transition:border .15s}
.inline-input:focus{border-color:var(--accent)}
.customer-chip{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--success-light);border:1px solid var(--success);border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--success)}
/* bottom bar mobile */
.bottom-bar{display:none}
@media(max-width:600px){
  .nav{display:none}
  .bottom-bar{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);z-index:50}
  .bottom-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border:none;background:transparent;color:var(--ink2);font-size:9px;font-weight:600;font-family:inherit;cursor:pointer;gap:2px}
  .bottom-btn span:first-child{font-size:19px}
  .bottom-btn.active{color:var(--accent)}
  .app{padding-bottom:72px}
}
/* print — etiquetas em folha A4 */
@media print{
  @page{size:A4 portrait;margin:8mm}
  body *{visibility:hidden !important}
  #print-area,#print-area *{visibility:visible !important}
  #print-area{
    position:fixed;inset:0;
    background:#fff;
    display:grid !important;
    grid-template-columns:repeat(3,63mm);
    grid-auto-rows:32mm;
    gap:2mm 3mm;
    padding:0;
    align-content:start;
    width:189mm;
  }
  .print-label{
    border:.4pt solid #ccc;
    border-radius:1.5mm;
    padding:2.5mm 3mm;
    page-break-inside:avoid;
    background:#fff;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
  }
  .print-label-top{display:flex;flex-direction:column;gap:.3mm}
  .print-shop{font-size:5.5pt;font-weight:700;color:#aaa;letter-spacing:.4pt;text-transform:uppercase}
  .print-name{font-size:8.5pt;font-weight:700;color:#111;line-height:1.2}
  .print-detail{font-size:7pt;color:#555}
  .print-price{font-size:7.5pt;font-weight:700;color:#111}
  .print-label svg{max-width:100%;height:22mm !important}
}
`;

// ── App Root ──────────────────────────────────────────────────────────────────
// ── Tela de Login ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged no App vai detectar e chamar onLogin automaticamente
    } catch(err) {
      console.error(err);
      const msgs = {
        "auth/invalid-credential":    "E-mail ou senha incorretos.",
        "auth/user-not-found":        "Usuario nao encontrado.",
        "auth/wrong-password":        "Senha incorreta.",
        "auth/too-many-requests":     "Muitas tentativas. Aguarde alguns minutos.",
        "auth/network-request-failed":"Sem conexao com a internet.",
      };
      setError(msgs[err.code] || "Erro ao fazer login. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"var(--bg)", fontFamily:"'DM Sans',sans-serif", padding:16,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#f5f4f0;--surface:#fff;--border:#e0ddd8;--ink:#1a1917;--ink2:#6b6860;
              --accent:#1a6b5a;--accent-light:#e8f4f0;--accent-btn:#22876f;
              --danger:#c0392b;--danger-light:#fdf0ef;--radius:12px;--radius-sm:8px;}
        body{background:var(--bg)}
      `}</style>
      <div style={{
        background:"var(--surface)", borderRadius:16, padding:36,
        width:"100%", maxWidth:380,
        boxShadow:"0 4px 24px rgba(0,0,0,.10)",
        border:"1px solid var(--border)",
      }}>
        {/* Logo */}
        <div style={{textAlign:"center", marginBottom:28}}>
          <div style={{
            width:52, height:52, background:"var(--accent)", borderRadius:14,
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            fontSize:26, marginBottom:12,
          }}>🦷</div>
          <div style={{fontSize:22, fontWeight:700, color:"var(--ink)"}}>AventalPro</div>
          <div style={{fontSize:13, color:"var(--ink2)", marginTop:4}}>Controle de Estoque</div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} style={{display:"flex", flexDirection:"column", gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px"}}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
              style={{
                padding:"11px 14px", border:"1.5px solid var(--border)", borderRadius:"var(--radius-sm)",
                fontFamily:"inherit", fontSize:14, color:"var(--ink)", outline:"none",
                transition:"border .15s",
                background: loading ? "#f9f9f9" : "#fff",
              }}
              onFocus={e=>e.target.style.borderColor="var(--accent)"}
              onBlur={e=>e.target.style.borderColor="var(--border)"}
            />
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px"}}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              style={{
                padding:"11px 14px", border:"1.5px solid var(--border)", borderRadius:"var(--radius-sm)",
                fontFamily:"inherit", fontSize:14, color:"var(--ink)", outline:"none",
                transition:"border .15s",
                background: loading ? "#f9f9f9" : "#fff",
              }}
              onFocus={e=>e.target.style.borderColor="var(--accent)"}
              onBlur={e=>e.target.style.borderColor="var(--border)"}
            />
          </div>

          {error && (
            <div style={{
              padding:"10px 14px", background:"var(--danger-light)",
              borderRadius:"var(--radius-sm)", fontSize:13, color:"var(--danger)", fontWeight:500,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              marginTop:6, padding:"13px", border:"none", borderRadius:"var(--radius-sm)",
              background: loading ? "#aaa" : "var(--accent-btn)", color:"#fff",
              fontFamily:"inherit", fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
              transition:"background .15s",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div style={{marginTop:20,textAlign:"center",fontSize:11,color:"var(--ink2)"}}>
          Acesso restrito. Fale com o administrador para obter suas credenciais.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser]         = useState(null);       // Firebase user
  const [authReady, setAuthReady] = useState(false);    // auth initialized?
  const [tab, setTab]           = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [sales, setSales]       = useState([]);
  const [toast, setToast]       = useState(null);
  const [loading, setLoading]   = useState(false);      // data loading

  // ── Observar estado de autenticação ────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        // Usuário logado → carregar dados
        setLoading(true);
        const p = await load("products-v1");
        const s = await load("sales-v1");
        if (p) setProducts(p);
        if (s) setSales(s);
        setLoading(false);
      } else {
        // Usuário saiu → limpar dados locais
        setProducts([]);
        setSales([]);
      }
    });
    return () => unsub();
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(null), 2800);
  }, []);

  const saveProducts = useCallback(async (list) => {
    setProducts(list); await save("products-v1", list);
  }, []);

  const saveSales = useCallback(async (list) => {
    setSales(list); await save("sales-v1", list);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  // ── Auth ainda inicializando ───────────────────────────────────────────────
  if (!authReady) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#6b6860"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🦷</div><p>Carregando...</p></div>
    </div>
  );

  // ── Não logado → mostrar tela de login ────────────────────────────────────
  if (!user) return <LoginScreen />;

  // ── Carregando dados após login ───────────────────────────────────────────
  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#6b6860"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🦷</div><p>Sincronizando dados...</p></div>
    </div>
  );

  const tabs = [
    {id:"dashboard", label:"Inicio",    icon:"📊"},
    {id:"etiquetas", label:"Etiquetas", icon:"🏷️"},
    {id:"venda",     label:"Venda",     icon:"🛒"},
    {id:"historico", label:"Historico", icon:"📋"},
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">🦷</div>
          <div style={{flex:1}}>
            <h1>AventalPro</h1>
            <p>Controle de Estoque</p>
          </div>
          {/* Usuário logado + botão sair */}
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span style={{fontSize:11,color:"var(--ink2)",display:"none"}} className="user-email">{user.email}</span>
            <button
              onClick={handleLogout}
              style={{
                padding:"6px 12px", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
                background:"var(--surface2)", color:"var(--ink2)", fontFamily:"inherit",
                fontSize:12, fontWeight:600, cursor:"pointer",
              }}
              title={`Sair (${user.email})`}
            >
              Sair 🚪
            </button>
          </div>
        </header>
        <nav className="nav">
          {tabs.map(t => (
            <button key={t.id} className={`nav-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        {tab==="dashboard" && <Dashboard  products={products} saveProducts={saveProducts} showToast={showToast} sales={sales} />}
        {tab==="etiquetas" && <Etiquetas  products={products} saveProducts={saveProducts} showToast={showToast} />}
        {tab==="venda"     && <Venda      products={products} saveProducts={saveProducts} saveSales={saveSales} sales={sales} showToast={showToast} />}
        {tab==="historico" && <Historico  sales={sales} products={products} />}
      </div>
      <div className="bottom-bar">
        {tabs.map(t => (
          <button key={t.id} className={`bottom-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function ProductFormModal({ products, saveProducts, showToast, editingProduct, onClose }) {
  const editing = editingProduct?.id || null;
  const [form, setForm] = useState(() => editingProduct
    ? { category: editingProduct.category||CATEGORIES[0], model: editingProduct.model, color: editingProduct.color, size: editingProduct.size, barcode: editingProduct.barcode||"", stock: editingProduct.stock, price: editingProduct.price||"" }
    : { category: CATEGORIES[0], model:"", color: COLORS[0], size: SIZES[1], barcode:"", stock:0, price:"" }
  );
  const [scanMode, setScanMode]     = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const barcodeRef = useRef();
  const modelRef   = useRef();

  const existingModels = [...new Set(
    products
      .filter(p => p.category === form.category && (!editing || p.id !== editing))
      .map(p => p.model)
      .filter(Boolean)
  )];
  const suggestFiltered = existingModels.filter(
    m => m.toLowerCase().includes((form.model||"").toLowerCase()) && m !== form.model
  );

  const saveItem = () => {
    if (!form.model.trim()) return showToast("Informe o modelo");
    if (!form.category)     return showToast("Selecione a categoria");
    const dup = products.find(p => p.barcode && p.barcode === form.barcode.trim() && p.id !== editing);
    if (dup) return showToast("Codigo de barras ja cadastrado");
    if (editing) {
      saveProducts(products.map(p => p.id === editing
        ? { ...p, ...form, barcode: form.barcode.trim(), stock: Number(form.stock), price: form.price ? Number(form.price) : undefined }
        : p
      ));
      showToast("Produto atualizado");
    } else {
      saveProducts([...products, {
        id: uid(), ...form,
        barcode: form.barcode.trim(),
        stock: Number(form.stock),
        price: form.price ? Number(form.price) : undefined,
      }]);
      showToast("Produto cadastrado");
    }
    onClose();
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          {editing ? "Editar Produto" : "Novo Produto"}
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="field">
            <label>Categoria</label>
            <select value={form.category} onChange={e => { setForm(f => ({...f, category: e.target.value, model:""})); setShowSuggest(false); }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Modelo / Nome</label>
            <div className="field-relative">
              <input
                ref={modelRef}
                placeholder={existingModels.length > 0 ? "Selecione ou digite novo modelo..." : "Digite o nome do modelo..."}
                value={form.model}
                onChange={e => { setForm(f => ({...f, model: e.target.value})); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                autoComplete="off"
                style={{padding:"10px 12px",border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",fontFamily:"inherit",fontSize:14,color:"var(--ink)",outline:"none",width:"100%",transition:"border .15s"}}
              />
              {showSuggest && suggestFiltered.length > 0 && (
                <div className="suggest-list">
                  {suggestFiltered.map(m => (
                    <div key={m} className="suggest-item" onMouseDown={() => { setForm(f => ({...f, model:m})); setShowSuggest(false); }}>
                      <span>{CAT_ICON[form.category]||"📦"}</span>{m}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {existingModels.length > 0 && !showSuggest && !form.model && (
              <div style={{fontSize:11,color:"var(--ink2)"}}>
                Existentes: {existingModels.slice(0,4).join(", ")}{existingModels.length>4?` +${existingModels.length-4}`:""}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="field">
              <label>Cor</label>
              <select value={form.color} onChange={e => setForm(f => ({...f, color:e.target.value}))}>
                {COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tamanho</label>
              <select value={form.size} onChange={e => setForm(f => ({...f, size:e.target.value}))}>
                {SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Estoque inicial</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({...f, stock:e.target.value}))} />
            </div>
            <div className="field">
              <label>Preco (opcional)</label>
              <input type="number" min="0" step="0.01" placeholder="0,00" value={form.price} onChange={e => setForm(f => ({...f, price:e.target.value}))} />
            </div>
          </div>

          <div className="field">
            <label>Codigo de Barras</label>
            <input ref={barcodeRef} className={scanMode ? "scan-focus" : ""}
              placeholder="Escaneie ou deixe vazio para gerar depois..."
              value={form.barcode}
              onChange={e => setForm(f => ({...f, barcode:e.target.value}))}
              onFocus={() => setScanMode(true)}
              onBlur={() => setScanMode(false)}
              onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); barcodeRef.current?.blur(); setScanMode(false); }}} />
            {scanMode && <div style={{fontSize:11,color:"var(--accent)",marginTop:2}}>📡 Aguardando scanner...</div>}
          </div>

          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" style={{flex:1}} onClick={saveItem}>{editing ? "Salvar" : "Cadastrar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ products, saveProducts, showToast, sales }) {
  const [modal, setModal]         = useState(false);    // novo produto
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeCat, setActiveCat] = useState(null);     // aba de categoria ativa

  // Categorias que têm produtos
  const usedCats = CATEGORIES.filter(c => products.some(p => p.category === c));
  const uncatProducts = products.filter(p => !p.category || !CATEGORIES.includes(p.category));
  const allCats = uncatProducts.length > 0 ? [...usedCats, "Sem categoria"] : usedCats;

  // Aba ativa padrão = primeira categoria disponível
  const currentCat = activeCat && allCats.includes(activeCat) ? activeCat : (allCats[0] || null);

  // Produtos da aba ativa
  const catProducts = currentCat === "Sem categoria"
    ? uncatProducts
    : products.filter(p => p.category === currentCat);

  // Agrupados por modelo dentro da aba ativa
  const modelGroups = [...new Set(catProducts.map(p => p.model))].map(model => ({
    model,
    rows: catProducts.filter(p => p.model === model),
    total: catProducts.filter(p => p.model === model).reduce((s, p) => s + p.stock, 0),
  }));

  // Estoque baixo
  const lowStock = products.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock);

  // Últimas vendas
  const recent = [...sales].sort((a,b) => b.date - a.date).slice(0, 5);

  const openNew  = () => { setEditingProduct(null); setModal(true); };
  const openEdit = (p)  => { setEditingProduct(p);  setModal(true); };
  const delProduct = (id) => {
    if (!confirm("Remover este produto?")) return;
    saveProducts(products.filter(p => p.id !== id));
    showToast("Produto removido");
  };

  const withBC = products.filter(p => p.barcode).length;

  return (
    <div>
      {/* Cabeçalho da página + botão novo produto */}
      <div className="section-head" style={{marginBottom:16}}>
        <h2 style={{fontSize:16,fontWeight:700}}>Estoque</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Novo Produto</button>
      </div>

      {/* Aviso sem código de barras */}
      {products.length > 0 && withBC < products.length && (
        <div className="card" style={{marginBottom:14,border:"1.5px solid var(--warn)",background:"var(--warn-light)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>🏷️</span>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{products.length - withBC} produto(s) sem codigo de barras</div>
              <div style={{fontSize:12,color:"var(--ink2)"}}>Acesse Etiquetas para gerar os codigos.</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabelas por categoria em abas */}
      {products.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📦</div>
            <p style={{fontWeight:600,marginBottom:6}}>Nenhum produto cadastrado</p>
            <p style={{marginBottom:16,fontSize:13}}>Clique em "+ Novo Produto" para comecar.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          {/* Abas de categoria */}
          <div className="cat-tabs">
            {allCats.map(cat => {
              const count = cat === "Sem categoria"
                ? uncatProducts.reduce((s,p) => s+p.stock, 0)
                : products.filter(p => p.category===cat).reduce((s,p) => s+p.stock, 0);
              return (
                <button
                  key={cat}
                  className={`cat-tab ${currentCat===cat?"active":""}`}
                  onClick={() => setActiveCat(cat)}
                >
                  <span>{CAT_ICON[cat]||"📦"}</span>
                  {cat}
                  <span className="cat-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo da aba */}
          {modelGroups.length === 0 ? (
            <div className="empty" style={{padding:"20px 0"}}>
              <div className="empty-icon" style={{fontSize:28}}>📦</div>
              <p>Nenhum produto nesta categoria.</p>
            </div>
          ) : modelGroups.map(g => (
            <div key={g.model} style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--ink)",display:"flex",alignItems:"center",gap:8}}>
                  <span>{CAT_ICON[currentCat]||"📦"}</span>
                  {g.model}
                </div>
                <span style={{fontSize:12,color:"var(--ink2)",fontWeight:500}}>{g.total} un total</span>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cor</th>
                      <th>Tamanho</th>
                      <th>Cod. Barras</th>
                      <th>Preco</th>
                      <th>Estoque</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <span style={{width:11,height:11,borderRadius:"50%",background:COLOR_HEX[p.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}} />
                            {p.color}
                          </div>
                        </td>
                        <td style={{fontWeight:600}}>{p.size}</td>
                        <td>{p.barcode ? <span className="mono">{p.barcode}</span> : <span style={{fontSize:11,color:"var(--warn)"}}>Sem codigo</span>}</td>
                        <td>{p.price ? fmt(p.price) : <span style={{color:"var(--ink3)"}}>—</span>}</td>
                        <td style={{fontWeight:700}}>{p.stock}</td>
                        <td>
                          <span className={`badge ${p.stock===0?"badge-out":p.stock<=5?"badge-low":"badge-ok"}`}>
                            {p.stock===0?"Zerado":p.stock<=5?"Baixo":"OK"}
                          </span>
                        </td>
                        <td>
                          <div style={{display:"flex",gap:6}}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                            <button className="btn btn-sm" style={{background:"var(--danger-light)",color:"var(--danger)"}} onClick={() => delProduct(p.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estoque Baixo */}
      {lowStock.length > 0 && (
        <div className="card" style={{marginTop:14}}>
          <div className="card-title"><span>⚠️</span>Estoque Baixo</div>
          {lowStock.map(p => {
            const pct = Math.min(100, (p.stock / 20) * 100);
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,paddingBottom:10,marginBottom:10,borderBottom:"1px solid var(--border)"}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:COLOR_HEX[p.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>
                    {p.category && <span style={{fontSize:11,color:"var(--ink2)",marginRight:5}}>[{p.category}]</span>}
                    {p.model} — {p.color} / {p.size}
                  </div>
                  <div className="stock-bar">
                    <div className="stock-bar-fill" style={{width:pct+"%", background:p.stock===0?"var(--danger)":"var(--warn)"}} />
                  </div>
                </div>
                <span className={`badge ${p.stock===0?"badge-out":"badge-low"}`}>
                  {p.stock===0?"Zerado":`${p.stock} un`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Últimas vendas */}
      {recent.length > 0 && (
        <div className="card" style={{marginTop:14}}>
          <div className="card-title"><span>🛒</span>Ultimas Vendas</div>
          {recent.map(s => {
            const qty = s.items.reduce((a,i) => a+i.qty, 0);
            return (
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Venda #{s.id.slice(-4).toUpperCase()}</div>
                  <div style={{fontSize:11,color:"var(--ink2)"}}>{fmtDate(s.date)} · {qty} peca{qty!==1?"s":""}</div>
                </div>
                {s.total > 0 && <div style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{fmt(s.total)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      {modal && (
        <ProductFormModal
          products={products}
          saveProducts={saveProducts}
          showToast={showToast}
          editingProduct={editingProduct}
          onClose={() => { setModal(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

// ── Etiquetas ─────────────────────────────────────────────────────────────────
function Etiquetas({ products, saveProducts, showToast }) {
  const [selected, setSelected]   = useState(new Set());
  const [filter, setFilter]       = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch]       = useState("");
  const [editModal, setEditModal] = useState(null);
  const [editCode, setEditCode]   = useState("");
  const [scanMode, setScanMode]   = useState(false);
  const [copies, setCopies]       = useState(1);
  const [shopName, setShopName]   = useState("Minha Loja");
  const scanRef = useRef();

  const withoutBC = products.filter(p => !p.barcode).length;
  const cats = CATEGORIES.filter(c => products.some(p => p.category===c));

  const filtered = products.filter(p => {
    const mf = filter==="all"||(filter==="with"&&p.barcode)||(filter==="without"&&!p.barcode);
    const mc = catFilter==="all"||(p.category||"")===catFilter;
    const ms = p.model.toLowerCase().includes(search.toLowerCase())||
      (p.barcode||"").includes(search)||p.color.toLowerCase().includes(search.toLowerCase());
    return mf && mc && ms;
  });

  const toggle = (id) => setSelected(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });

  const generateOne = (p) => {
    const code = genBarcode(products);
    saveProducts(products.map(x => x.id===p.id ? {...x, barcode:code} : x));
    showToast("Codigo gerado: "+code);
  };
  const generateAll = () => {
    let updated = [...products]; let count = 0;
    updated = updated.map(p => {
      if (p.barcode) return p;
      const code = genBarcode(updated);
      updated = updated.map(x => x.id===p.id ? {...x, barcode:code} : x);
      count++;
      return {...p, barcode:code};
    });
    saveProducts(updated); showToast(count+" codigo(s) gerado(s)");
  };
  const openEdit = (p) => { setEditModal(p); setEditCode(p.barcode||""); setScanMode(false); };
  const saveEdit = () => {
    if (editCode.trim().length < 4) return showToast("Minimo 4 caracteres");
    const dup = products.find(p => p.barcode===editCode.trim() && p.id!==editModal.id);
    if (dup) return showToast("Codigo ja em uso");
    saveProducts(products.map(p => p.id===editModal.id ? {...p, barcode:editCode.trim()} : p));
    showToast("Codigo salvo"); setEditModal(null);
  };
  const clearCode = (p) => {
    if (!confirm("Remover codigo de barras deste produto?")) return;
    saveProducts(products.map(x => x.id===p.id ? {...x, barcode:""} : x));
    showToast("Codigo removido");
  };
  const selectedWithBC = [...selected].filter(id => products.find(p => p.id===id && p.barcode)).length;

  const printLabels = () => {
    if (selectedWithBC===0) return showToast("Selecione etiquetas com codigo");
    const items = [];
    [...selected].forEach(id => {
      const p = products.find(x => x.id===id);
      if (!p || !p.barcode) return;
      for (let i=0; i<copies; i++) items.push(p);
    });
    const area = document.getElementById("print-area");
    area.innerHTML = "";
    items.forEach(p => {
      const div = document.createElement("div");
      div.className = "print-label";
      const svgId = "svg"+Math.random().toString(36).slice(2);
      div.innerHTML = `
        <div class="print-label-top">
          <div class="print-shop">${shopName}</div>
          <div class="print-name">${p.model}</div>
          <div class="print-detail">${p.category||""} · ${p.color} · Tam. ${p.size}</div>
        </div>
        <svg id="${svgId}"></svg>
        ${p.price ? `<div class="print-price">R$ ${Number(p.price).toFixed(2).replace(".",",")}</div>` : ""}
      `;
      area.appendChild(div);
      setTimeout(() => {
        if (!window.JsBarcode) return;
        try {
          window.JsBarcode("#"+svgId, p.barcode, {
            format:"CODE128", width:1.4, height:36,
            displayValue:true, fontSize:7, font:"monospace",
            lineColor:"#000", margin:1, background:"transparent",
          });
        } catch(e) {}
      }, 150);
    });
    setTimeout(() => window.print(), 600);
  };

  return (
    <div>
      <div className="section-head"><h2>Etiquetas de Codigo de Barras</h2></div>

      <div className="card" style={{marginBottom:14,background:"var(--accent-light)",border:"1.5px solid var(--accent)"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>ℹ️</span>
          <div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.5}}>
            <b style={{color:"var(--ink)"}}>Compativel com Knup KP-1025</b> — Formato <b>CODE 128</b>. Gere, selecione e imprima para colar nas embalagens.
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          <div style={{position:"relative",flex:1,minWidth:150}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink3)",fontSize:15,pointerEvents:"none"}}>🔍</span>
            <input className="search-inp" style={{paddingLeft:36}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">Todos ({products.length})</option>
            <option value="with">Com codigo ({products.length-withoutBC})</option>
            <option value="without">Sem codigo ({withoutBC})</option>
          </select>
          <select className="filter-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
            <option value="all">Todas categorias</option>
            {cats.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
          {withoutBC>0 && <button className="btn btn-primary btn-sm" onClick={generateAll}>⚡ Gerar todos sem codigo ({withoutBC})</button>}
          <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(new Set(filtered.filter(p=>p.barcode).map(p=>p.id)))}>Selecionar todos</button>
          {selected.size>0 && <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(new Set())}>Limpar ({selected.size})</button>}
          <div style={{flex:1}} />
          {selectedWithBC>0 && (
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Nome da loja"
                style={{padding:"7px 10px",border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",fontFamily:"inherit",fontSize:13,outline:"none",width:130}} />
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:12,color:"var(--ink2)"}}>Copias:</span>
                <input type="number" min="1" max="30" value={copies} onChange={e=>setCopies(Math.max(1,+e.target.value))}
                  style={{width:48,padding:"7px 8px",border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",fontFamily:"inherit",fontSize:13,outline:"none",textAlign:"center"}} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={printLabels}>🖨️ Imprimir ({selectedWithBC})</button>
            </div>
          )}
        </div>
      </div>

      {filtered.length===0 ? (
        <div className="card"><div className="empty"><div className="empty-icon">🏷️</div><p>Nenhum produto encontrado.</p></div></div>
      ) : (
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          {/* Cabeçalho da lista */}
          <div style={{display:"grid",gridTemplateColumns:"24px 1fr 110px 90px 120px",gap:8,padding:"9px 16px",background:"var(--surface2)",borderBottom:"2px solid var(--border)",fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px"}}>
            <div></div>
            <div>Produto</div>
            <div>Codigo</div>
            <div>Estoque</div>
            <div>Acoes</div>
          </div>
          {filtered.map((p, i) => (
            <div key={p.id}
              style={{
                display:"grid",
                gridTemplateColumns:"24px 1fr 110px 90px 120px",
                gap:8,
                alignItems:"center",
                padding:"10px 16px",
                borderBottom: i < filtered.length-1 ? "1px solid var(--border)" : "none",
                background: selected.has(p.id) ? "var(--accent-light)" : "transparent",
                transition:"background .15s",
              }}
            >
              {/* Checkbox */}
              <div>
                {p.barcode ? (
                  <div
                    className={`label-chk ${selected.has(p.id)?"on":""}`}
                    style={{position:"static",width:18,height:18}}
                    onClick={()=>toggle(p.id)}
                  >{selected.has(p.id)?"✓":""}</div>
                ) : <div style={{width:18}}/>}
              </div>

              {/* Info produto */}
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:COLOR_HEX[p.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}} />
                  <span style={{fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.model}</span>
                </div>
                <div style={{fontSize:11,color:"var(--ink2)",paddingLeft:15}}>
                  {p.category && <span style={{marginRight:4}}>{CAT_ICON[p.category]||""} {p.category} ·</span>}
                  {p.color} · {p.size}
                  {p.price ? <span style={{marginLeft:4,color:"var(--accent)",fontWeight:600}}>{fmt(p.price)}</span> : ""}
                </div>
              </div>

              {/* Código */}
              <div>
                {p.barcode ? (
                  <span className="mono" style={{fontSize:11}}>{p.barcode}</span>
                ) : (
                  <span style={{fontSize:11,color:"var(--warn)",fontWeight:600}}>Sem codigo</span>
                )}
              </div>

              {/* Estoque */}
              <div>
                <span style={{
                  fontWeight:700,
                  fontSize:13,
                  color: p.stock===0?"var(--danger)":p.stock<=5?"var(--warn)":"var(--ink)"
                }}>{p.stock}</span>
                <span style={{fontSize:11,color:"var(--ink3)",marginLeft:3}}>un</span>
              </div>

              {/* Ações */}
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {p.barcode ? (
                  <>
                    <button className="btn btn-ghost btn-sm" style={{padding:"4px 8px",fontSize:11}} onClick={()=>openEdit(p)}>✏️</button>
                    <button className="btn btn-sm" style={{background:"var(--danger-light)",color:"var(--danger)",padding:"4px 8px",fontSize:11}} onClick={()=>clearCode(p)}>🗑️</button>
                    <button
                      className={`btn btn-sm ${selected.has(p.id)?"btn-primary":"btn-outline"}`}
                      style={{padding:"4px 8px",fontSize:11}}
                      onClick={()=>toggle(p.id)}
                    >{selected.has(p.id)?"✓":"+ Sel"}</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary btn-sm" style={{padding:"4px 8px",fontSize:11}} onClick={()=>generateOne(p)}>⚡ Gerar</button>
                    <button className="btn btn-ghost btn-sm" style={{padding:"4px 8px",fontSize:11}} onClick={()=>openEdit(p)}>✏️</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setEditModal(null)}>
          <div className="modal">
            <div className="modal-title">Editar Codigo<button className="close-btn" onClick={()=>setEditModal(null)}>×</button></div>
            <div style={{marginBottom:14,padding:12,background:"var(--surface2)",borderRadius:"var(--radius-sm)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:12,height:12,borderRadius:"50%",background:COLOR_HEX[editModal.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}} />
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{editModal.model}</div>
                <div style={{fontSize:12,color:"var(--ink2)"}}>{editModal.category} · {editModal.color} · {editModal.size}</div>
              </div>
            </div>
            {editCode && <div style={{background:"var(--surface2)",borderRadius:8,padding:"12px 4px",marginBottom:14}}><BarcodeDisplay value={editCode} height={58} fontSize={11} /></div>}
            <div className="field" style={{marginBottom:6}}>
              <label>Codigo CODE 128</label>
              <input ref={scanRef} value={editCode} className={scanMode?"scan-focus":""}
                onChange={e=>setEditCode(e.target.value)}
                onFocus={()=>setScanMode(true)} onBlur={()=>setScanMode(false)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scanRef.current?.blur();setScanMode(false);}}}
                placeholder="Digite, escaneie ou gere automaticamente..."
                style={{fontFamily:"'DM Mono',monospace",letterSpacing:1}} />
              {scanMode && <div style={{fontSize:11,color:"var(--accent)",marginTop:2}}>📡 Aguardando scanner...</div>}
            </div>
            <div style={{fontSize:11,color:"var(--ink2)",marginBottom:14}}>Letras, numeros e hifens. Minimo 4 caracteres.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>setEditModal(null)}>Cancelar</button>
              <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>setEditCode(genBarcode(products))}>⚡ Auto-gerar</button>
              <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={saveEdit} disabled={editCode.length<4}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      <div id="print-area" style={{display:"none"}} />
    </div>
  );
}

// ── Helpers para local do dia ─────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `vendaLocal_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getStoredLocation() {
  try { return localStorage.getItem(todayKey()) || ""; } catch { return ""; }
}
function setStoredLocation(val) {
  try { localStorage.setItem(todayKey(), val); } catch {}
}

// ── PDV / Venda ───────────────────────────────────────────────────────────────
function Venda({ products, saveProducts, saveSales, sales, showToast }) {
  // Local do dia
  const [location, setLocation] = useState(getStoredLocation);
  const [editingLoc, setEditingLoc] = useState(!getStoredLocation());
  const locRef = useRef();

  // Cliente opcional
  const [customer, setCustomer]       = useState({ name:"", phone:"" });
  const [showCustomer, setShowCustomer] = useState(false);

  // Scanner
  const [scanVal, setScanVal]   = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const scanRef = useRef();
  const bufRef  = useRef("");
  const timerRef = useRef(null);

  // Busca manual inline
  const [searchQ, setSearchQ]         = useState("");
  const [showSearch, setShowSearch]   = useState(false);

  // Carrinho
  const [cart, setCart] = useState([]);

  // Totais
  const [discount, setDiscount] = useState(""); // %
  const [freight,  setFreight]  = useState(""); // R$

  const subtotal    = cart.reduce((s,i) => s + i.price*i.qty, 0);
  const totalQty    = cart.reduce((s,i) => s + i.qty, 0);
  const totalItems  = cart.length;
  const discountVal = discount ? subtotal * (parseFloat(discount)/100) : 0;
  const freightVal  = freight  ? parseFloat(freight) : 0;
  const grandTotal  = subtotal - discountVal + freightVal;

  // Salvar local do dia
  const saveLocation = () => {
    if (!location.trim()) return showToast("Informe o local da venda");
    setStoredLocation(location.trim());
    setEditingLoc(false);
    locRef.current?.blur();
  };

  // Adicionar produto ao carrinho
  const addProduct = useCallback((product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId===product.id);
      if (idx >= 0) {
        // Verificar estoque disponível (descontando o que já está no carrinho)
        const inCart = prev[idx].qty;
        const available = product.stock; // stock ainda não foi descontado
        if (inCart >= available) { showToast("Maximo disponivel: "+available+" un"); return prev; }
        const u = [...prev]; u[idx] = {...u[idx], qty: u[idx].qty+1}; return u;
      }
      if (product.stock === 0) { showToast("Sem estoque: "+product.model); return prev; }
      return [...prev, {
        productId: product.id,
        barcode:   product.barcode||"",
        name:      product.model,
        category:  product.category||"",
        color:     product.color,
        size:      product.size,
        qty:       1,
        price:     product.price||0,
      }];
    });
    setLastScan({ ok:true, name:`${product.model} — ${product.color}/${product.size}` });
    showToast("✔ "+product.model+" "+product.color+"/"+product.size);
  }, [products, showToast]);

  // Scanner (leitor USB age como teclado)
  const processBarcode = useCallback((code) => {
    const c = code.trim(); if (!c) return;
    const product = products.find(p => p.barcode===c);
    if (!product) {
      showToast("Codigo nao encontrado: "+c);
      setLastScan({ ok:false, name:"Cod. "+c+" nao encontrado" });
      return;
    }
    addProduct(product);
  }, [products, addProduct]);

  const handleScanChange = (e) => {
    bufRef.current = e.target.value; setScanVal(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (bufRef.current.length > 3) { processBarcode(bufRef.current); bufRef.current=""; setScanVal(""); }
    }, 280);
  };
  const handleScanKey = useCallback((e) => {
    if (e.key==="Enter") {
      e.preventDefault();
      const c = bufRef.current; bufRef.current=""; setScanVal("");
      if (c) processBarcode(c);
    }
  }, [processBarcode]);

  // Carrinho: remover / alterar qty
  const removeItem = (productId) => setCart(c => c.filter(i => i.productId!==productId));
  const changeQty  = (productId, delta) => {
    const p = products.find(x => x.id===productId);
    setCart(c => c.map(i => {
      if (i.productId!==productId) return i;
      const nq = Math.max(1, i.qty+delta);
      if (p && nq > p.stock) { showToast("Maximo disponivel: "+p.stock+" un"); return i; }
      return {...i, qty:nq};
    }));
  };

  // Finalizar venda
  const finalize = async () => {
    if (!cart.length) return showToast("Carrinho vazio");
    const loc = getStoredLocation() || location.trim() || "Nao informado";
    // Descontar estoque
    const updatedProducts = products.map(p => {
      const item = cart.find(i => i.productId===p.id);
      return item ? {...p, stock: Math.max(0, p.stock - item.qty)} : p;
    });
    const sale = {
      id:         uid(),
      date:       Date.now(),
      location:   loc,
      customer:   (customer.name||customer.phone) ? {...customer} : null,
      items:      cart.map(i => ({
        productId: i.productId,
        barcode:   i.barcode,
        name:      i.name,
        category:  i.category,
        color:     i.color,
        size:      i.size,
        qty:       i.qty,
        price:     i.price,
      })),
      subtotal,
      discountPct:  discount ? parseFloat(discount) : 0,
      discountVal,
      freight:      freightVal,
      total:        grandTotal,
    };
    await saveProducts(updatedProducts);
    await saveSales([...sales, sale]);
    setCart([]);
    setDiscount("");
    setFreight("");
    setLastScan(null);
    setCustomer({ name:"", phone:"" });
    setShowCustomer(false);
    showToast("Venda finalizada! "+totalQty+" peca"+(totalQty>1?"s":"")+" · "+fmt(grandTotal));
    scanRef.current?.focus();
  };

  // Busca manual
  const searchResults = searchQ.length >= 2
    ? products.filter(p =>
        p.model.toLowerCase().includes(searchQ.toLowerCase()) ||
        p.color.toLowerCase().includes(searchQ.toLowerCase()) ||
        (p.category||"").toLowerCase().includes(searchQ.toLowerCase()) ||
        (p.barcode||"").includes(searchQ)
      ).slice(0, 10)
    : [];

  return (
    <div>
      {/* Título */}
      <div className="section-head" style={{marginBottom:12}}>
        <h2 style={{fontSize:16,fontWeight:700}}>PDV — Registrar Venda</h2>
        {cart.length>0 && (
          <span className="badge badge-ok">{totalItems} item{totalItems!==1?"s":""} · {totalQty} un</span>
        )}
      </div>

      {/* ── Local da venda (persiste o dia inteiro) ── */}
      <div className={`pdv-location ${location&&!editingLoc?"set":""}`} style={{marginBottom:12}}>
        <span className="pdv-location-icon">📍</span>
        <div className="pdv-location-body">
          <div className="pdv-location-label">Local da venda — {new Date().toLocaleDateString("pt-BR")}</div>
          {editingLoc ? (
            <input
              ref={locRef}
              autoFocus
              placeholder="Ex: Feira Odonto SP, Loja Centro..."
              value={location}
              onChange={e=>setLocation(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveLocation()}
              style={{padding:0,border:"none",background:"transparent",fontFamily:"inherit",fontSize:13,fontWeight:700,color:"var(--ink)",outline:"none",width:"100%"}}
            />
          ) : (
            <div className="pdv-location-val">{location||"Nao informado"}</div>
          )}
        </div>
        {editingLoc ? (
          <button className="btn btn-primary btn-sm" onClick={saveLocation} style={{flexShrink:0}}>Salvar</button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={()=>setEditingLoc(true)} style={{flexShrink:0}}>✏️</button>
        )}
      </div>

      <div className="pdv-wrap">
        {/* ── Coluna esquerda: scanner + busca + carrinho ── */}
        <div className="pdv-left">

          {/* Scanner */}
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>
              Scanner de Codigo de Barras
            </div>
            <div className="scan-row">
              <input
                ref={scanRef}
                className={scanning?"scanning":""}
                placeholder="Escaneie ou digite o codigo..."
                value={scanVal}
                onChange={handleScanChange}
                onKeyDown={handleScanKey}
                onFocus={()=>setScanning(true)}
                onBlur={()=>setScanning(false)}
                autoComplete="off"
              />
              <div className={`scan-indicator ${scanning?"on":""}`} onClick={()=>scanRef.current?.focus()} title="Clique para ativar scanner">
                {scanning?"📡":"📷"}
              </div>
            </div>
            {lastScan && (
              <div style={{marginTop:8,fontSize:12,fontWeight:600,padding:"6px 10px",borderRadius:"var(--radius-sm)",background:lastScan.ok?"var(--success-light)":"var(--danger-light)",color:lastScan.ok?"var(--success)":"var(--danger)"}}>
                {lastScan.ok?"✔ "+lastScan.name:"✘ "+lastScan.name}
              </div>
            )}
          </div>

          {/* Busca manual inline */}
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>
              Buscar Produto pelo Nome
            </div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink3)",fontSize:14,pointerEvents:"none"}}>🔍</span>
              <input
                style={{width:"100%",padding:"9px 12px 9px 34px",border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",fontFamily:"inherit",fontSize:14,outline:"none",transition:"border .15s"}}
                placeholder="Modelo, categoria, cor..."
                value={searchQ}
                onChange={e=>setSearchQ(e.target.value)}
                onFocus={()=>setShowSearch(true)}
                onBlur={()=>setTimeout(()=>setShowSearch(false),160)}
              />
            </div>
            {showSearch && searchResults.length>0 && (
              <div style={{marginTop:6,border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",overflow:"hidden"}}>
                {searchResults.map(p=>(
                  <div key={p.id}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderBottom:"1px solid var(--border)",cursor:"pointer",background:"var(--surface)"}}
                    onMouseDown={()=>{addProduct(p);setSearchQ("");}}
                  >
                    <span style={{width:10,height:10,borderRadius:"50%",background:COLOR_HEX[p.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,display:"flex",gap:6,alignItems:"center"}}>
                        {p.category&&<span style={{fontSize:10,color:"var(--ink3)"}}>{CAT_ICON[p.category]||""}</span>}
                        {p.model}
                      </div>
                      <div style={{fontSize:11,color:"var(--ink2)"}}>{p.color} · {p.size} · {p.stock} un em estoque</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:p.stock===0?"var(--danger)":p.stock<=5?"var(--warn)":"var(--accent)",flexShrink:0}}>
                      {p.stock===0?"Zerado":p.price?fmt(p.price):"S/Preco"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {showSearch && searchQ.length>=2 && searchResults.length===0 && (
              <div style={{marginTop:6,padding:"8px 12px",fontSize:13,color:"var(--ink2)"}}>Nenhum produto encontrado.</div>
            )}
          </div>

          {/* Cliente (opcional) */}
          <div className="card" style={{padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: showCustomer?10:0}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px"}}>
                Cliente (opcional)
              </div>
              <button className="btn btn-ghost btn-sm" style={{padding:"4px 10px"}} onClick={()=>setShowCustomer(o=>!o)}>
                {showCustomer?"▲ Ocultar":"👤 Informar"}
              </button>
            </div>
            {(customer.name||customer.phone) && !showCustomer && (
              <div className="customer-chip">
                👤 {customer.name||"—"}{customer.phone?" · "+customer.phone:""}
              </div>
            )}
            {showCustomer && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="field">
                  <label>Nome</label>
                  <input placeholder="Nome do cliente..." value={customer.name} onChange={e=>setCustomer(c=>({...c,name:e.target.value}))} />
                </div>
                <div className="field">
                  <label>Telefone / WhatsApp</label>
                  <input placeholder="(00) 00000-0000" value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))} />
                </div>
                {(customer.name||customer.phone)&&(
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setCustomer({name:"",phone:""});setShowCustomer(false);}}>
                    Remover cliente
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita: carrinho + totais + finalizar ── */}
        <div className="pdv-right">
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            {/* Header carrinho */}
            <div style={{padding:"12px 16px",background:"var(--surface2)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                🛒 Carrinho
                {cart.length>0&&<span className="badge badge-ok">{totalItems}</span>}
              </div>
              {cart.length>0&&(
                <button style={{border:"none",background:"none",cursor:"pointer",fontSize:11,color:"var(--danger)",fontWeight:600,fontFamily:"inherit"}}
                  onClick={()=>{if(confirm("Limpar carrinho?"))setCart([]);}}>
                  Limpar
                </button>
              )}
            </div>

            {cart.length===0 ? (
              <div style={{padding:"28px 16px",textAlign:"center",color:"var(--ink3)"}}>
                <div style={{fontSize:28,marginBottom:8}}>🛒</div>
                <div style={{fontSize:13}}>Escaneie ou busque um produto</div>
              </div>
            ) : (
              <>
                {/* Itens */}
                <div style={{overflowX:"auto"}}>
                  <table className="cart-table" style={{minWidth:320}}>
                    <thead>
                      <tr>
                        <th style={{width:"40%"}}>Produto</th>
                        <th style={{textAlign:"center"}}>Qtd</th>
                        <th style={{textAlign:"right"}}>Total</th>
                        <th style={{width:28}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item=>(
                        <tr key={item.productId}>
                          <td>
                            <div style={{fontWeight:600,fontSize:12,lineHeight:1.3}}>{item.name}</div>
                            <div style={{fontSize:10,color:"var(--ink2)"}}>{item.color} · {item.size}</div>
                            {item.price>0&&<div style={{fontSize:10,color:"var(--ink3)"}}>{fmt(item.price)}/un</div>}
                          </td>
                          <td style={{textAlign:"center"}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                              <button className="qty-btn" style={{width:22,height:22,fontSize:13}} onClick={()=>changeQty(item.productId,-1)}>−</button>
                              <span style={{fontWeight:700,minWidth:18,textAlign:"center",fontSize:13}}>{item.qty}</span>
                              <button className="qty-btn" style={{width:22,height:22,fontSize:13}} onClick={()=>changeQty(item.productId,1)}>+</button>
                            </div>
                          </td>
                          <td style={{textAlign:"right",fontWeight:700,fontSize:13,color:item.price>0?"var(--ink)":"var(--ink3)"}}>
                            {item.price>0 ? fmt(item.price*item.qty) : "—"}
                          </td>
                          <td style={{textAlign:"center"}}>
                            <button onClick={()=>removeItem(item.productId)}
                              style={{border:"none",background:"none",cursor:"pointer",color:"var(--danger)",fontSize:15,lineHeight:1,padding:"2px"}}>
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumo / totais */}
                <div style={{padding:"12px 16px",borderTop:"2px solid var(--border)"}}>
                  {/* Linha 1: itens e quantidade */}
                  <div className="summary-row">
                    <span className="summary-label">Itens no pedido</span>
                    <span className="summary-val">{totalItems} prod. · {totalQty} un</span>
                  </div>
                  {/* Linha 2: subtotal */}
                  <div className="summary-row">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-val">{subtotal>0?fmt(subtotal):"—"}</span>
                  </div>
                  {/* Linha 3: desconto */}
                  <div className="summary-row">
                    <span className="summary-label">Desconto (%)</span>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input
                        className="inline-input"
                        type="number" min="0" max="100" step="0.1"
                        placeholder="0"
                        value={discount}
                        onChange={e=>setDiscount(e.target.value)}
                      />
                      {discountVal>0&&<span style={{fontSize:12,color:"var(--danger)",fontWeight:600}}>−{fmt(discountVal)}</span>}
                    </div>
                  </div>
                  {/* Linha 4: frete */}
                  <div className="summary-row">
                    <span className="summary-label">Frete / Envio (R$)</span>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input
                        className="inline-input"
                        type="number" min="0" step="0.01"
                        placeholder="0,00"
                        value={freight}
                        onChange={e=>setFreight(e.target.value)}
                      />
                      {freightVal>0&&<span style={{fontSize:12,color:"var(--warn)",fontWeight:600}}>+{fmt(freightVal)}</span>}
                    </div>
                  </div>
                  {/* Linha 5: total final */}
                  <div className="summary-row" style={{borderTop:"2px solid var(--border)",paddingTop:12,marginTop:4}}>
                    <span style={{fontSize:14,fontWeight:700,color:"var(--ink)"}}>Total Final</span>
                    <span className="summary-total">{fmt(grandTotal)}</span>
                  </div>
                </div>

                {/* Botão finalizar */}
                <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)"}}>
                  {(customer.name||customer.phone)&&(
                    <div className="customer-chip" style={{marginBottom:10}}>
                      👤 {customer.name||"—"}{customer.phone?" · "+customer.phone:""}
                    </div>
                  )}
                  <button className="btn btn-primary btn-full" style={{fontSize:15,padding:"12px"}} onClick={finalize}>
                    Finalizar Venda ✓
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de detalhe do pedido ────────────────────────────────────────────────
function OrderDetailModal({ sale, products, onClose }) {
  if (!sale) return null;

  // Enrich items
  const items = (sale.items||[]).map(item => {
    const p = products.find(x => x.id===item.productId);
    return {
      ...item,
      model:    item.name     || p?.model    || "—",
      color:    item.color    || p?.color    || "—",
      size:     item.size     || p?.size     || "—",
      category: item.category || p?.category || "—",
    };
  });

  // Group by category
  const catGroups = CATEGORIES
    .filter(c => items.some(i => i.category===c))
    .map(c => ({ cat:c, rows: items.filter(i=>i.category===c) }));
  const nocat = items.filter(i => !CATEGORIES.includes(i.category));
  if (nocat.length) catGroups.push({ cat:"Outros", rows:nocat });

  const handlePrint = () => {
    const w = window.open("","_blank","width=794,height=1123");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Pedido #${sale.id.slice(-4).toUpperCase()}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:20px;font-size:13px}
      h1{font-size:18px;font-weight:700;margin-bottom:4px}
      .sub{font-size:12px;color:#666;margin-bottom:16px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;padding:12px;background:#f5f5f5;border-radius:6px}
      .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#888}
      .info-val{font-size:13px;font-weight:600;color:#111}
      h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #ddd}
      table{width:100%;border-collapse:collapse;margin-bottom:6px}
      th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#888;padding:5px 8px;border-bottom:2px solid #ddd;text-align:left}
      td{padding:7px 8px;border-bottom:1px solid #eee;font-size:12px;vertical-align:middle}
      .tr-subtotal td{background:#f0f0f0;font-weight:700;font-size:12px}
      .totals{margin-top:16px;border-top:2px solid #111;padding-top:12px}
      .tot-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
      .tot-row.final{font-size:16px;font-weight:700;color:#1a6b5a;border-top:1px solid #ccc;margin-top:6px;padding-top:8px}
      .footer{margin-top:24px;font-size:10px;color:#aaa;text-align:center}
    </style></head><body>
    <h1>Pedido #${sale.id.slice(-4).toUpperCase()}</h1>
    <div class="sub">${new Date(sale.date).toLocaleString("pt-BR")}</div>
    <div class="info-grid">
      <div><div class="info-label">Local da Venda</div><div class="info-val">${sale.location||"Nao informado"}</div></div>
      <div><div class="info-label">Cliente</div><div class="info-val">${sale.customer?(sale.customer.name||"—")+(sale.customer.phone?" · "+sale.customer.phone:""):"Nao informado"}</div></div>
    </div>
    ${catGroups.map(g=>`
      <h3>${CAT_ICON[g.cat]||""} ${g.cat}</h3>
      <table>
        <thead><tr><th>Modelo</th><th>Cor</th><th>Tam.</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${g.rows.map(r=>`
            <tr>
              <td><b>${r.model}</b></td>
              <td>${r.color}</td>
              <td>${r.size}</td>
              <td style="text-align:center;font-weight:700">${r.qty}</td>
              <td style="text-align:right">${r.price>0?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(r.price):"—"}</td>
              <td style="text-align:right;font-weight:700">${r.price>0?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(r.qty*r.price):"—"}</td>
            </tr>`).join("")}
          <tr class="tr-subtotal">
            <td colspan="3">Subtotal ${g.cat}</td>
            <td style="text-align:center">${g.rows.reduce((s,r)=>s+r.qty,0)}</td>
            <td></td>
            <td style="text-align:right">${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(g.rows.reduce((s,r)=>s+r.qty*r.price,0))}</td>
          </tr>
        </tbody>
      </table>`).join("")}
    <div class="totals">
      <div class="tot-row"><span>Subtotal produtos</span><span>${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(sale.subtotal||0)}</span></div>
      ${sale.discountVal>0?`<div class="tot-row"><span>Desconto (${sale.discountPct}%)</span><span style="color:#c0392b">− ${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(sale.discountVal)}</span></div>`:""}
      ${sale.freight>0?`<div class="tot-row"><span>Frete / Envio</span><span style="color:#c07a1a">+ ${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(sale.freight)}</span></div>`:""}
      <div class="tot-row final"><span>Total Final</span><span>${new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(sale.total||0)}</span></div>
    </div>
    <div class="footer">AventalPro — documento gerado em ${new Date().toLocaleString("pt-BR")}</div>
    </body></html>`);
    w.document.close();
    setTimeout(()=>{ w.focus(); w.print(); }, 400);
  };

  return (
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:620}}>
        {/* Título */}
        <div className="modal-title">
          <div>
            <div style={{fontSize:18,fontWeight:700}}>Pedido #{sale.id.slice(-4).toUpperCase()}</div>
            <div style={{fontSize:12,color:"var(--ink2)",fontWeight:400}}>{fmtDate(new Date(sale.date))}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨️ Imprimir</button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Info geral */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          <div style={{padding:"10px 12px",background:"var(--surface2)",borderRadius:"var(--radius-sm)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px"}}>Local da Venda</div>
            <div style={{fontSize:13,fontWeight:600,marginTop:2}}>📍 {sale.location||"Nao informado"}</div>
          </div>
          <div style={{padding:"10px 12px",background:"var(--surface2)",borderRadius:"var(--radius-sm)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px"}}>Cliente</div>
            <div style={{fontSize:13,fontWeight:600,marginTop:2,color:sale.customer?"var(--success)":"var(--ink3)"}}>
              {sale.customer
                ? `👤 ${sale.customer.name||"—"}${sale.customer.phone?" · "+sale.customer.phone:""}`
                : "Nao informado"}
            </div>
          </div>
        </div>

        {/* Itens por categoria */}
        {catGroups.map(g=>(
          <div key={g.cat} style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
              <span>{CAT_ICON[g.cat]||"📦"}</span>{g.cat}
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Modelo</th><th>Cor</th><th>Tam.</th>
                    <th style={{textAlign:"center"}}>Qtd</th>
                    <th style={{textAlign:"right"}}>Unit.</th>
                    <th style={{textAlign:"right"}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{r.model}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{width:9,height:9,borderRadius:"50%",background:COLOR_HEX[r.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}}/>
                          {r.color}
                        </div>
                      </td>
                      <td style={{fontWeight:600}}>{r.size}</td>
                      <td style={{textAlign:"center",fontWeight:700}}>{r.qty}</td>
                      <td style={{textAlign:"right"}}>{r.price>0?fmt(r.price):"—"}</td>
                      <td style={{textAlign:"right",fontWeight:700,color:r.price>0?"var(--accent)":"var(--ink3)"}}>
                        {r.price>0?fmt(r.qty*r.price):"—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:"var(--surface2)"}}>
                    <td colSpan={3} style={{fontWeight:700,fontSize:12,padding:"7px 10px",color:"var(--ink2)"}}>Subtotal {g.cat}</td>
                    <td style={{textAlign:"center",fontWeight:700}}>{g.rows.reduce((s,r)=>s+r.qty,0)}</td>
                    <td></td>
                    <td style={{textAlign:"right",fontWeight:700,color:"var(--accent)"}}>{fmt(g.rows.reduce((s,r)=>s+r.qty*r.price,0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Totais */}
        <div style={{borderTop:"2px solid var(--border)",paddingTop:12,marginTop:4}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}>
            <span style={{color:"var(--ink2)"}}>Subtotal produtos</span>
            <span style={{fontWeight:600}}>{fmt(sale.subtotal||0)}</span>
          </div>
          {sale.discountVal>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}>
              <span style={{color:"var(--danger)"}}>Desconto ({sale.discountPct}%)</span>
              <span style={{fontWeight:600,color:"var(--danger)"}}>− {fmt(sale.discountVal)}</span>
            </div>
          )}
          {sale.freight>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}>
              <span style={{color:"var(--warn)"}}>Frete / Envio</span>
              <span style={{fontWeight:600,color:"var(--warn)"}}>+ {fmt(sale.freight)}</span>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:6,borderTop:"1px solid var(--border)"}}>
            <span style={{fontSize:15,fontWeight:700}}>Total Final</span>
            <span style={{fontSize:18,fontWeight:700,color:"var(--accent)"}}>{fmt(sale.total||0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Historico ─────────────────────────────────────────────────────────────────
function Historico({ sales, products }) {
  const now = new Date();
  const [selMonth, setSelMonth]   = useState(now.getMonth());
  const [selYear,  setSelYear]    = useState(now.getFullYear());
  const [catFilter, setCatFilter] = useState("all");

  const [selectedSale, setSelectedSale] = useState(null);

  const years = [...new Set(sales.map(s => new Date(s.date).getFullYear()))].sort((a,b)=>b-a);
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

  // Flatten all sale items with enriched data
  const allItems = [];
  sales.forEach(sale => {
    sale.items.forEach(item => {
      const p = products.find(x => x.id===item.productId);
      const d = new Date(sale.date);
      allItems.push({
        saleId:      sale.id,
        date:        d,
        month:       d.getMonth(),
        year:        d.getFullYear(),
        location:    sale.location||"",
        customer:    sale.customer||null,
        model:       p?.model    || item.name     || "—",
        size:        item.size   || p?.size        || "—",
        color:       item.color  || p?.color       || "—",
        category:    item.category || p?.category  || "Outro",
        qty:         item.qty,
        price:       item.price  || 0,
        subtotal:    item.qty * (item.price||0),
        // sale-level
        saleSubtotal:   sale.subtotal   || 0,
        discountPct:    sale.discountPct || 0,
        discountVal:    sale.discountVal || 0,
        freightVal:     sale.freight     || 0,
        saleTotal:      sale.total       || 0,
      });
    });
  });

  // Items of the selected period + optional category filter
  const periodItems = allItems.filter(i =>
    i.month===selMonth && i.year===selYear &&
    (catFilter==="all" || i.category===catFilter)
  );

  const cats = CATEGORIES.filter(c => allItems.some(i => i.category===c));

  // Grand total of the period
  const grandTotal = periodItems.reduce((s,i) => s+i.subtotal, 0);
  const grandQty   = periodItems.reduce((s,i) => s+i.qty,      0);

  // Build per-category groups, aggregated by model+color+size
  const catGroups = CATEGORIES
    .filter(cat => catFilter==="all" ? periodItems.some(i=>i.category===cat) : cat===catFilter)
    .map(cat => {
      const items = periodItems.filter(i => i.category===cat);
      // Aggregate: same model+color+size → sum qty and subtotal
      const agg = {};
      items.forEach(i => {
        const key = `${i.model}|${i.color}|${i.size}|${i.price}`;
        if (!agg[key]) agg[key] = { model:i.model, color:i.color, size:i.size, price:i.price, qty:0, subtotal:0 };
        agg[key].qty      += i.qty;
        agg[key].subtotal += i.subtotal;
      });
      const rows    = Object.values(agg).sort((a,b)=>a.model.localeCompare(b.model));
      const catQty  = rows.reduce((s,r)=>s+r.qty,0);
      const catVal  = rows.reduce((s,r)=>s+r.subtotal,0);
      return { cat, rows, catQty, catVal };
    })
    .filter(g => g.rows.length > 0);

  // Unique sales in the period for the info header
  const periodSales = [...new Map(
    periodItems
      .filter(i => catFilter==="all" || i.category===catFilter)
      .map(i => [i.saleId, {
        saleId:     i.saleId,
        date:       i.date,
        location:   i.location,
        customer:   i.customer,
        saleTotal:  i.saleTotal,
        discountPct:i.discountPct,
        discountVal:i.discountVal,
        freightVal: i.freightVal,
      }])
  ).values()].sort((a,b)=>a.date-b.date);

  // ── Exportar para Excel ──────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = () => doExport();
      document.head.appendChild(s);
    } else {
      doExport();
    }
  };

  const doExport = () => {
    const XLSX = window.XLSX;
    const wb   = XLSX.utils.book_new();

    // ── Aba 1: Resumo dos pedidos ──
    const pedidosHeader = [
      ["Pedido","Data","Hora","Local","Cliente","Telefone","Subtotal","Desconto %","Desconto R$","Frete","Total Final"]
    ];
    const pedidosRows = periodSales.map(s => [
      "#"+s.saleId.slice(-4).toUpperCase(),
      s.date.toLocaleDateString("pt-BR"),
      s.date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
      s.location||"",
      s.customer?.name||"",
      s.customer?.phone||"",
      s.saleTotal - (s.discountVal||0) + (s.freightVal||0) - (s.freightVal||0) + (s.discountVal||0),  // subtotal
      s.discountPct||0,
      s.discountVal||0,
      s.freightVal||0,
      s.saleTotal||0,
    ]);
    const wsPedidos = XLSX.utils.aoa_to_sheet([...pedidosHeader, ...pedidosRows]);
    wsPedidos["!cols"] = [8,12,8,20,20,16,12,10,12,10,12].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, wsPedidos, "Pedidos");

    // ── Aba 2: Itens detalhados ──
    const itensHeader = [
      ["Pedido","Data","Hora","Local","Cliente","Categoria","Modelo","Cor","Tamanho","Quantidade","Preco Unit.","Total Item"]
    ];
    const itensRows = [];
    periodSales.forEach(s => {
      const saleObj = sales.find(x => x.id===s.saleId);
      if (!saleObj) return;
      saleObj.items.forEach(item => {
        const p = products.find(x => x.id===item.productId);
        itensRows.push([
          "#"+s.saleId.slice(-4).toUpperCase(),
          s.date.toLocaleDateString("pt-BR"),
          s.date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
          s.location||"",
          s.customer?.name||"",
          item.category || p?.category || "",
          item.name     || p?.model    || "",
          item.color    || p?.color    || "",
          item.size     || p?.size     || "",
          item.qty,
          item.price||0,
          item.qty*(item.price||0),
        ]);
      });
    });
    const wsItens = XLSX.utils.aoa_to_sheet([...itensHeader, ...itensRows]);
    wsItens["!cols"] = [8,12,8,20,20,12,18,10,8,10,12,12].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, wsItens, "Itens Detalhados");

    // ── Aba 3: Resumo por categoria ──
    const catHeader = [["Categoria","Modelo","Cor","Tamanho","Qtd Total","Subtotal"]];
    const catRows = [];
    catGroups.forEach(g => {
      g.rows.forEach(r => {
        catRows.push([g.cat, r.model, r.color, r.size, r.qty, r.subtotal]);
      });
      catRows.push(["SUBTOTAL "+g.cat,"","","",g.catQty,g.catVal]);
      catRows.push([]);
    });
    catRows.push(["TOTAL GERAL","","","",grandQty,grandTotal]);
    const wsCat = XLSX.utils.aoa_to_sheet([...catHeader, ...catRows]);
    wsCat["!cols"] = [14,18,10,10,10,14].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, wsCat, "Por Categoria");

    const fileName = `AventalPro_${MONTHS_PT[selMonth]}_${selYear}${catFilter!=="all"?`_${catFilter}`:""}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>Historico de Vendas</h2>

      {/* Modal de detalhe */}
      {selectedSale && (
        <OrderDetailModal
          sale={selectedSale}
          products={products}
          onClose={()=>setSelectedSale(null)}
        />
      )}

      {/* Filtros */}
      <div className="card" style={{marginBottom:14}}>
        <div className="filters-bar">
          <select className="filter-select" value={selMonth} onChange={e=>setSelMonth(+e.target.value)}>
            {MONTHS_PT.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className="filter-select" value={selYear} onChange={e=>setSelYear(+e.target.value)}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <select className="filter-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
            <option value="all">Todas categorias</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{flex:1}} />
          {periodItems.length>0 && (
            <button
              className="btn btn-outline btn-sm"
              style={{whiteSpace:"nowrap",fontWeight:700}}
              onClick={exportExcel}
              title="Exportar dados do periodo para Excel (.xlsx)"
            >
              📥 Exportar Excel
            </button>
          )}
        </div>
        {/* Resumo do período */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {grandTotal>0 && (
            <div style={{padding:"10px 14px",background:"var(--accent-light)",borderRadius:"var(--radius-sm)",flex:1,minWidth:120,border:"1px solid var(--accent)"}}>
              <div style={{fontSize:11,color:"var(--accent)",fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Receita do Periodo</div>
              <div style={{fontSize:24,fontWeight:700,color:"var(--accent)"}}>{fmt(grandTotal)}</div>
            </div>
          )}
          <div style={{padding:"10px 14px",background:"var(--surface2)",borderRadius:"var(--radius-sm)",flex:1,minWidth:120}}>
            <div style={{fontSize:11,color:"var(--ink2)",fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>Periodo</div>
            <div style={{fontSize:15,fontWeight:700}}>{MONTHS_PT[selMonth]} / {selYear}</div>
          </div>
        </div>
      </div>

      {periodItems.length===0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📋</div>
            <p>Nenhuma venda em <b>{MONTHS_PT[selMonth]} de {selYear}</b>{catFilter!=="all"?` — "${catFilter}"`:""}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Vendas do período — detalhes por pedido */}
          {periodSales.length > 0 && (
            <div className="card" style={{marginBottom:14}}>
              <div className="card-title"><span>📑</span>Pedidos do Periodo ({periodSales.length})</div>
              {periodSales.map((s, si) => (
                <div key={s.saleId} style={{paddingBottom:12,marginBottom:12,borderBottom: si<periodSales.length-1?"1px solid var(--border)":"none"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>
                        Pedido #{s.saleId.slice(-4).toUpperCase()}
                        {s.location&&<span style={{marginLeft:8,fontSize:11,fontWeight:500,color:"var(--ink2)"}}>📍 {s.location}</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--ink2)"}}>
                        {fmtDate(s.date)}
                      </div>
                      {s.customer && (
                        <div style={{fontSize:11,color:"var(--success)",fontWeight:600,marginTop:2}}>
                          👤 {s.customer.name||"—"}{s.customer.phone?" · "+s.customer.phone:""}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <div style={{textAlign:"right"}}>
                        {s.discountVal>0&&<div style={{fontSize:11,color:"var(--danger)"}}>Desconto {s.discountPct}%: −{fmt(s.discountVal)}</div>}
                        {s.freightVal>0&&<div style={{fontSize:11,color:"var(--warn)"}}>Frete: +{fmt(s.freightVal)}</div>}
                        <div style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{s.saleTotal>0?fmt(s.saleTotal):"—"}</div>
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{fontSize:11,padding:"4px 10px"}}
                        onClick={()=>setSelectedSale(sales.find(x=>x.id===s.saleId))}
                      >
                        🔍 Visualizar pedido
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {catGroups.map(g => (
            <div key={g.cat} className="card" style={{marginBottom:14}}>
              {/* Cabeçalho da categoria */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:10,borderBottom:"2px solid var(--border)"}}>
                <span style={{fontSize:20}}>{CAT_ICON[g.cat]||"📦"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--ink)"}}>{g.cat}</div>
                  <div style={{fontSize:12,color:"var(--ink2)"}}>{g.catQty} peça{g.catQty!==1?"s":""} vendida{g.catQty!==1?"s":""}</div>
                </div>
                {g.catVal>0 && (
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"var(--ink2)",fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>Total categoria</div>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--accent)"}}>{fmt(g.catVal)}</div>
                  </div>
                )}
              </div>

              {/* Tabela de produtos da categoria */}
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Cor</th>
                      <th>Tamanho</th>
                      <th style={{textAlign:"center"}}>Qtd</th>
                      <th style={{textAlign:"right"}}>Valor Unit.</th>
                      <th style={{textAlign:"right"}}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((row, i) => (
                      <tr key={i}>
                        <td style={{fontWeight:600}}>{row.model}</td>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{width:10,height:10,borderRadius:"50%",background:COLOR_HEX[row.color]||"#ccc",flexShrink:0,border:"1px solid rgba(0,0,0,.1)"}} />
                            {row.color}
                          </div>
                        </td>
                        <td style={{fontWeight:600}}>{row.size}</td>
                        <td style={{fontWeight:700,textAlign:"center"}}>{row.qty}</td>
                        <td style={{textAlign:"right"}}>
                          {row.price>0 ? fmt(row.price) : <span style={{color:"var(--ink3)"}}>—</span>}
                        </td>
                        <td style={{fontWeight:700,textAlign:"right",color:row.subtotal>0?"var(--accent)":"var(--ink3)"}}>
                          {row.subtotal>0 ? fmt(row.subtotal) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Rodapé da categoria */}
                  <tfoot>
                    <tr style={{background:"var(--accent-light)"}}>
                      <td colSpan={3} style={{fontWeight:700,fontSize:13,padding:"10px",color:"var(--accent)"}}>
                        Subtotal — {g.cat}
                      </td>
                      <td style={{fontWeight:700,fontSize:13,textAlign:"center",color:"var(--accent)"}}>{g.catQty}</td>
                      <td></td>
                      <td style={{fontWeight:700,fontSize:13,textAlign:"right",color:"var(--accent)"}}>
                        {g.catVal>0 ? fmt(g.catVal) : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Rodapé geral do mês */}
          <div className="card" style={{marginTop:6,border:"2px solid var(--accent)",background:"var(--accent-light)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:".5px"}}>
                  Total Geral — {MONTHS_PT[selMonth]} / {selYear}
                  {catFilter!=="all" && ` — ${catFilter}`}
                </div>
                <div style={{fontSize:12,color:"var(--ink2)",marginTop:2}}>
                  {grandQty} peça{grandQty!==1?"s":""} vendida{grandQty!==1?"s":""}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:28,fontWeight:700,color:"var(--accent)"}}>
                  {grandTotal>0 ? fmt(grandTotal) : "—"}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
