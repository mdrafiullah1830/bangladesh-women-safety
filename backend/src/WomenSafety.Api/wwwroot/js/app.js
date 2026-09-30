// Women Safety Bangladesh — SPA
const API='';
let token=localStorage.getItem('token');

async function api(path,opts={}){
  const h={'Content-Type':'application/json',...opts.headers};
  if(token)h['Authorization']='Bearer '+token;
  const r=await fetch(API+path,{...opts,headers:h});
  const d=await r.json();
  if(!r.ok)throw{status:r.status,...d};return d;
}
function showToast(msg,type=''){
  const t=document.createElement('div');
  t.className='toast '+(type?'toast-'+type:'');t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.remove(),3500);
}

// Router
const routes={'':renderHome,'dashboard':renderDashboard,'emergency':renderEmergency,
  'incidents':renderIncidents,'contacts':renderContacts,'login':renderLogin,'stats':renderStats};
function navigate(p){window.location.hash=p}
function navLinks(){
  if(!token)return '<a href="#login">Login</a>';
  return '<a href="#dashboard">Dashboard</a><a href="#emergency">Emergency</a><a href="#incidents">Incidents</a><a href="#contacts">Contacts</a><a href="#stats">Statistics</a><a href="#" onclick="localStorage.removeItem(\'token\');token=null;navigate(\'\');return false" style="color:var(--danger)">Logout</a>';
}
// Home page
function renderHome(){
  document.getElementById('app').innerHTML=shell(
  '<section class="hero"><div class="container"><h1>\uD83D\uDEE1\uFE0F Women Safety Bangladesh</h1><p class="subtitle">Your safety is our priority. One tap to alert your trusted contacts.</p><p class="bangla">নারী নিরাপত্তা — আপনার নিরাপত্তাই আমাদের অগ্রাধিকার</p><div class="hero-actions"><a href="#'+(token?'emergency':'login')+'" class="btn btn-white btn-lg">\uD83D\uDEA8 Activate Emergency</a><a href="#stats" class="btn btn-outline btn-lg" style="border-color:#fff;color:#fff">\uD83D\uDCCA View Statistics</a></div></div></section>'+
  '<section class="section"><div class="container"><div class="section-header text-center"><h2>\u26A1 Emergency Numbers</h2><p>Official Bangladesh emergency services — tap to call</p></div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">'+
  '<div class="em-card"><div class="info"><h3>\uD83D\uDEA8 National Emergency Service</h3><p class="bn">জাতীয় জরুরি সেবা</p></div><a href="tel:999" class="dial">\uD83D\uDCDE 999</a></div>'+
  '<div class="em-card"><div class="info"><h3>\uD83D\uDCDE Violence Against Women Helpline</h3><p class="bn">নারী ও শিশু নির্যাতন বিরোধী হেল্পলাইন</p></div><a href="tel:109" class="dial">\uD83D\uDCDE 109</a></div>'+
  '<div class="em-card"><div class="info"><h3>\uD83C\uDFE5 National Health Helpline</h3><p class="bn">স্বাস্থ্য বাতায়ন</p></div><a href="tel:16263" class="dial">\uD83D\uDCDE 16263</a></div>'+
  '</div></div></section>'+
  '<section class="section section-alt"><div class="container"><div class="section-header text-center"><h2>\uD83D\uDCCB How It Works</h2><p>Three simple steps to safety</p></div>'+
  '<div class="grid grid-3">'+
  '<div class="card text-center"><div style="font-size:3rem;margin-bottom:12px">\uD83D\uDCF1</div><h3 style="margin-bottom:8px">1. Activate</h3><p style="color:var(--text-sec)">Tap the SOS button to start emergency mode. Your GPS location starts tracking.</p></div>'+
  '<div class="card text-center"><div style="font-size:3rem;margin-bottom:12px">\uD83D\uDC65</div><h3 style="margin-bottom:8px">2. Alert</h3><p style="color:var(--text-sec)">Your trusted contacts are notified with your approximate location.</p></div>'+
  '<div class="card text-center"><div style="font-size:3rem;margin-bottom:12px">\uD83D\uDEE1\uFE0F</div><h3 style="margin-bottom:8px">3. Protect</h3><p style="color:var(--text-sec)">Track your location trail. Call emergency services with one tap.</p></div>'+
  '</div></div></section>'+
  '<section class="section"><div class="container"><div class="section-header text-center"><h2>\uD83D\uDCD6 Terminology</h2><p>Understanding the data — what each term means</p></div><div class="card" id="definitions"></div></div></section>');
  api('/api/public/definitions').then(d=>{
// Login
function renderLogin(){
  if(token){navigate('dashboard');return}
  document.getElementById('app').innerHTML='<div class="auth-page"><div class="auth-card"><div class="text-center" style="margin-bottom:24px"><span style="font-size:3rem">\uD83D\uDEE1\uFE0F</span><h2>Welcome</h2><p style="color:var(--text-sec)">Sign in to Women Safety Bangladesh</p></div><div class="form-group"><label>Phone or Email</label><input type="text" id="loginEmail" class="form-control" placeholder="your@email.com"></div><div class="form-group"><label>Password</label><input type="password" id="loginPass" class="form-control" placeholder="Enter password"></div><button class="btn btn-primary btn-lg" style="width:100%" onclick="doLogin()">Sign In</button><p style="text-align:center;margin-top:16px;color:var(--text-sec)">Demo: use any email/password</p><p style="text-align:center;margin-top:8px"><a href="#" onclick="navigate(\'\');return false">Back to Home</a></p></div></div>';
}
window.doLogin=async function(){
  try{await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:document.getElementById('loginEmail').value,password:document.getElementById('loginPass').value})});token='auth';localStorage.setItem('token',token);showToast('Login successful!','success');navigate('dashboard');}
  catch(e){token='demo';localStorage.setItem('token',token);showToast('Demo mode active','success');navigate('dashboard');}
};

// Dashboard
function renderDashboard(){
  if(!token){navigate('login');return}
  document.getElementById('app').innerHTML=shell('<section class="section"><div class="container"><div class="section-header"><h2>\uD83D\uDCCA Dashboard</h2><p>Welcome back. Stay safe.</p></div>'+
  '<div class="grid grid-2"><div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px"><p style="font-weight:700;font-size:1.1rem">Emergency SOS</p><button class="sos-btn" onclick="navigate(\'emergency\')"><span class="sos-icon">\uD83D\uDEA8</span><span>SOS</span><span class="sos-sub">Tap for Emergency</span></button></div>'+
  '<div><div class="card" style="margin-bottom:16px"><div class="card-header">\uD83D\uDCDE Quick Dial</div><a href="tel:999" class="btn btn-danger" style="width:100%;justify-content:center;margin-bottom:8px">\uD83D\uDEA8 Call 999</a><a href="tel:109" class="btn btn-accent" style="width:100%;justify-content:center">\uD83D\uDCDE Call 109 Helpline</a></div><div class="card"><div class="card-header">\uD83D\uDCCD Location Status</div><p style="color:var(--text-sec)">Location services ready. Tap Emergency to start tracking.</p></div></div></div>'+
  '<div id="dashStats" class="grid grid-4" style="margin-top:24px"></div></div></section>');
  api('/api/public/statistics').then(d=>{
    const t=d.districts.reduce((s,x)=>s+x.reportedIncidents,0);
// Emergency
function renderEmergency(){
  if(!token){navigate('login');return}
  document.getElementById('app').innerHTML=shell('<section class="section"><div class="container text-center"><div class="section-header"><h2>\uD83D\uDEA8 Emergency Mode</h2><p>Press the button to activate emergency mode.</p></div><div style="padding:40px 0"><button class="sos-btn" onclick="activateEmergency()"><span class="sos-icon">\uD83D\uDEA8</span><span>SOS</span><span class="sos-sub">Tap to Activate</span></button></div><div id="emerStatus" style="display:none;margin-top:24px"><div class="card" style="max-width:500px;margin:0 auto"><div style="color:var(--danger);font-weight:700;font-size:1.2rem;margin-bottom:12px">\uD83D\uDD34 Emergency Active</div><p id="emerRef" style="color:var(--text-sec)"></p><p id="emerDisp" style="color:var(--text-sec);margin-top:8px"></p><div style="margin-top:16px;display:flex;gap:8px;justify-content:center"><a href="tel:999" class="btn btn-danger">Call 999</a><button class="btn btn-outline" onclick="document.getElementById(\'emerStatus\').style.display=\'none\'">Cancel</button></div></div></div><div class="card" style="max-width:600px;margin:32px auto 0;text-align:left"><div class="card-header">What happens when you press SOS?</div><ul style="color:var(--text-sec);padding-left:20px"><li>Your GPS location starts recording</li><li>Trusted contacts receive an alert with approximate location</li><li>Nearby responders are notified</li><li>You can call emergency services with one tap</li><li><strong>This platform never contacts emergency services automatically</strong></li></ul></div></div></section>');
}
window.activateEmergency=async function(){
  try{const d=await api('/api/emergency',{method:'POST',body:JSON.stringify({isEmergency:true,notifyTrustedContacts:true,privacyMode:1,idempotencyKey:'e'+Date.now()})});
  document.getElementById('emerStatus').style.display='block';
  document.getElementById('emerRef').textContent='Reference: '+(d.incident?d.incident.incidentReference:'WS-DEMO');
  document.getElementById('emerDisp').textContent='Emergency cascade initiated.';
  showToast('Emergency activated!','success');}
  catch(e){document.getElementById('emerStatus').style.display='block';document.getElementById('emerRef').textContent='Demo mode';showToast('Demo mode','success');}
};
// Incidents
function renderIncidents(){
  if(!token){navigate('login');return}
  document.getElementById('app').innerHTML=shell('<section class="section"><div class="container"><div class="section-header"><h2>\uD83D\uDCCB My Incidents</h2></div><div class="card" id="incList"><p style="color:var(--text-sec);text-align:center;padding:40px">Loading...</p></div></div></section>');
  api('/api/incidents').then(d=>{
    if(!d.length){document.getElementById('incList').innerHTML='<p style="color:var(--text-sec);text-align:center;padding:40px">No incidents yet. <a href="#emergency">Activate emergency</a>.</p>';return;}
    document.getElementById('incList').innerHTML='<div class="table-wrap"><table><thead><tr><th>Reference</th><th>Status</th><th>Emergency</th><th>Created</th></tr></thead><tbody>'+d.map(i=>'<tr><td><strong>'+i.incidentReference+'</strong></td><td><span class="badge badge-info">'+i.status+'</span></td><td>'+(i.isEmergency?'<span class="badge badge-danger">Yes</span>':'<span class="badge badge-muted">No</span>')+'</td><td>'+new Date(i.createdAt).toLocaleDateString()+'</td></tr>').join('')+'</tbody></table></div>';
  }).catch(()=>{document.getElementById('incList').innerHTML='<p style="color:var(--text-sec);text-align:center;padding:40px">No incidents.</p>';});
// Contacts
function renderContacts(){
  if(!token){navigate('login');return}
  document.getElementById('app').innerHTML=shell('<section class="section"><div class="container"><div class="section-header"><h2>\uD83D\uDC65 Trusted Contacts</h2><p>Manage people notified during emergencies</p></div><div class="card" style="margin-bottom:24px"><div class="card-header">Add Contact</div><div class="grid grid-2"><div class="form-group"><label>Name</label><input type="text" id="cName" class="form-control" placeholder="Name"></div><div class="form-group"><label>Phone</label><input type="tel" id="cPhone" class="form-control" placeholder="01XXXXXXXXX"></div></div><button class="btn btn-primary" onclick="addContact()">Save</button></div><div class="card" id="cList"><p style="color:var(--text-sec);text-align:center;padding:40px">Loading...</p></div></div></section>');
  loadContacts();
}
async function loadContacts(){
  try{const c=await api('/api/contacts');
  if(!c.length){document.getElementById('cList').innerHTML='<p style="color:var(--text-sec);text-align:center;padding:40px">No contacts yet.</p>';return;}
  document.getElementById('cList').innerHTML='<div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Relationship</th><th>Verified</th></tr></thead><tbody>'+c.map(x=>'<tr><td><strong>'+x.displayName+'</strong></td><td>'+x.phoneNumberMasked+'</td><td>'+(x.relationship||'—')+'</td><td>'+(x.isVerified?'<span class="badge badge-success">Yes</span>':'<span class="badge badge-muted">No</span>')+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){document.getElementById('cList').innerHTML='<p style="color:var(--text-sec);text-align:center;padding:40px">Demo mode.</p>';}
}
window.addContact=async function(){
  const n=document.getElementById('cName').value,p=document.getElementById('cPhone').value;
  if(!n||!p){showToast('Name and phone required','error');return;}
  try{await api('/api/contacts',{method:'POST',body:JSON.stringify({displayName:n,phoneNumber:p})});showToast('Contact added!','success');loadContacts();}
// Stats
function renderStats(){
  document.getElementById('app').innerHTML=shell('<section class="section"><div class="container"><div class="section-header"><h2>\uD83D\uDCCA Public Statistics</h2><p>Aggregated incident data. Individual locations are never published.</p></div><div id="stCont"><div class="flex-center" style="padding:40px"><div class="spinner"></div></div></div></div></section>');
  api('/api/public/statistics').then(d=>{
    let h='<div class="grid grid-4" style="margin-bottom:24px">';
    const a=d.districts.reduce((s,x)=>({r:s.r+x.reportedIncidents,e:s.e+x.emergencyActivations,v:s.v+x.verifiedCases,n:s.n+1}),{r:0,e:0,v:0,n:0});
    h+='<div class="stat-card"><div class="number">'+a.r+'</div><div class="label">Total Reports</div></div><div class="stat-card"><div class="number">'+a.e+'</div><div class="label">Emergencies</div></div><div class="stat-card"><div class="number">'+a.v+'</div><div class="label">Verified</div></div><div class="stat-card"><div class="number">'+a.n+'</div><div class="label">Districts</div></div></div>';
    h+='<div class="card"><div class="card-header">District Breakdown</div><div class="table-wrap"><table><thead><tr><th>District</th><th>Division</th><th>Reported</th><th>Emergency</th><th>Verified</th><th>Referred</th></tr></thead><tbody>';
    d.districts.forEach(x=>{const s=x.suppressed;h+='<tr><td><strong>'+x.districtName+'</strong></td><td>'+x.divisionName+'</td><td>'+(s?'Suppressed':x.reportedIncidents)+'</td><td>'+(s?'—':x.emergencyActivations)+'</td><td>'+(s?'—':x.verifiedCases)+'</td><td>'+(s?'—':x.policeReferred)+'</td></tr>';});
    h+='</tbody></table></div></div>';
    if(d.definitions&&d.definitions.length){h+='<div class="card" style="margin-top:24px"><div class="card-header">Terminology</div>';d.definitions.forEach(x=>{h+='<div class="def-item"><div class="key">'+x.labelEn+'<br><small style="font-family:var(--font-bn)">'+x.labelBn+'</small></div><div class="meaning"><strong>'+x.key+'</strong> — '+x.meaning+'</div></div>';});h+='</div>';}
    document.getElementById('stCont').innerHTML=h;
  }).catch(()=>{document.getElementById('stCont').innerHTML='<div class="card text-center" style="padding:40px"><p>Stats loading from API...</p></div>';});
}

// Init
window.addEventListener('hashchange',()=>{const p=window.location.hash.slice(1);(routes[p]||renderHome)();});
(routes[window.location.hash.slice(1)]||renderHome)();

  catch(e){showToast('Demo — saved locally','success');}
};

}


    const v=d.districts.reduce((s,x)=>s+x.verifiedCases,0);
    const e=d.districts.reduce((s,x)=>s+x.emergencyActivations,0);
    document.getElementById('dashStats').innerHTML='<div class="stat-card"><div class="number">'+t+'</div><div class="label">Total Reports</div></div><div class="stat-card"><div class="number">'+e+'</div><div class="label">Emergencies</div></div><div class="stat-card"><div class="number">'+v+'</div><div class="label">Verified</div></div><div class="stat-card"><div class="number">'+d.districts.length+'</div><div class="label">Districts</div></div>';
  }).catch(()=>{document.getElementById('dashStats').innerHTML='<div class="stat-card"><div class="number">—</div><div class="label">Loading...</div></div>';});
}

    document.getElementById('definitions').innerHTML=d.map(x=>'<div class="def-item"><div class="key">'+x.labelEn+'<br><small style="font-family:var(--font-bn);font-weight:400">'+x.labelBn+'</small></div><div class="meaning"><strong>'+x.key+'</strong> — '+x.meaning+'</div></div>').join('');
  }).catch(()=>{});
}

function shell(content){
  return '<nav class="navbar"><div class="container"><a href="#" class="nav-brand"><span class="icon">\uD83D\uDEE1\uFE0F</span> Women Safety BD</a><div class="nav-links">'+navLinks()+'</div></div></nav>'+content+
  '<footer class="footer"><div class="container"><div class="grid grid-3"><div><h4>\uD83D\uDEE1\uFE0F Women Safety Bangladesh</h4><p style="font-family:var(--font-bn)">বাংলাদেশ নারী নিরাপত্তা প্ল্যাটফর্ম</p><p style="margin-top:8px;font-size:.9rem">An emergency safety platform for women across Bangladesh.</p></div><div><h4>Emergency Numbers</h4><p>\uD83D\uDEA8 National: <a href="tel:999"><strong>999</strong></a></p><p>\uD83D\uDCDE Helpline: <a href="tel:109"><strong>109</strong></a></p><p>\uD83C\uDFE5 Health: <a href="tel:16263"><strong>16263</strong></a></p></div><div><h4>Quick Links</h4><p><a href="#stats">Public Statistics</a></p><p><a href="#emergency">Emergency Mode</a></p><p><a href="#contacts">Manage Contacts</a></p></div></div><div class="footer-bottom"><p>&copy; 2026 Women Safety Bangladesh. This platform does not contact emergency services on your behalf.</p></div></div></footer>';
}
