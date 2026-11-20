const KEY = 'bodyvision-demo-v1'

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]))

function seed() {
  return {
    profiles: [
      { id:'BV-001', name:'Paciente demostrativo', status:'active', age:34, created:'2026-11-18', consent:true },
      { id:'BV-002', name:'Expediente de prueba', status:'active', age:28, created:'2026-11-10', consent:false }
    ],
    measurements: [
      { id:'M-001', profile:'BV-001', metric:'Estatura', value:170, unit:'cm', date:'2026-10-01', method:'Observada manualmente', author:'Especialista demo' },
      { id:'M-002', profile:'BV-001', metric:'Estatura', value:170.2, unit:'cm', date:'2026-11-15', method:'Observada manualmente', author:'Especialista demo' },
      { id:'M-003', profile:'BV-001', metric:'Peso', value:68, unit:'kg', date:'2026-10-01', method:'Báscula', author:'Especialista demo' },
      { id:'M-004', profile:'BV-001', metric:'Peso', value:67.4, unit:'kg', date:'2026-11-15', method:'Báscula', author:'Especialista demo' }
    ],
    media: [], simulations: [], audit: [
      { action:'Sesión demostrativa iniciada', time:'2026-11-19 09:10', outcome:'Éxito' }
    ],
    reports: []
  }
}

export class BodyVisionApp {
  constructor(onViewer) {
    this.onViewer = onViewer
    this.page = 'dashboard'
    try { this.data = JSON.parse(localStorage.getItem(KEY)) || seed() } catch { this.data = seed() }
    this.save()
  }
  save() { localStorage.setItem(KEY, JSON.stringify(this.data)) }
  mount() {
    if (document.querySelector('#bv-app')) return
    const el = document.createElement('section')
    el.id = 'bv-app'
    el.className = 'bv-app hidden'
    el.setAttribute('aria-label','BODYVISION AI Enterprise')
    el.innerHTML = `
      <aside class="bv-sidebar">
        <button class="bv-brand" data-page="dashboard"><span>✚</span><div><b>BODYVISION</b><small>AI ENTERPRISE</small></div></button>
        <nav>
          ${this.nav('dashboard','▦','Dashboard')} ${this.nav('profiles','◉','Expedientes')}
          ${this.nav('measurements','↗','Mediciones')} ${this.nav('capture','◎','Captura')}
          ${this.nav('viewer','◇','Visor 3D')} ${this.nav('analytics','⌁','Analítica')}
          ${this.nav('simulations','◫','Simulación')} ${this.nav('reports','▤','Reportes')}
          ${this.nav('admin','⚙','Administración')}
        </nav>
        <button id="bv-close" class="bv-back">← Volver al 3D</button>
      </aside>
      <main class="bv-main">
        <header class="bv-header"><div><small>BODYVISION AI</small><h1 id="bv-title">Dashboard</h1></div><div class="bv-user"><span>DEMO</span><b>Especialista</b></div></header>
        <div id="bv-content" class="bv-content"></div>
      </main>`
    document.body.appendChild(el)
    el.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => this.open(b.dataset.page)))
    el.querySelector('#bv-close').addEventListener('click', () => this.close())
  }
  nav(page, icon, label) { return `<button data-page="${page}"><i>${icon}</i><span>${label}</span></button>` }
  open(page='dashboard') {
    this.mount(); this.page = page
    const el = document.querySelector('#bv-app'); el.classList.remove('hidden')
    document.body.classList.add('bv-open')
    el.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page))
    this.render()
  }
  close() {
    document.querySelector('#bv-app')?.classList.add('hidden')
    document.body.classList.remove('bv-open')
  }
  render() {
    const title = {dashboard:'Dashboard',profiles:'Expedientes',measurements:'Mediciones',capture:'Captura segura',viewer:'Visor 3D',analytics:'Analítica temporal',simulations:'Simulación hipotética',reports:'Reportes',admin:'Administración'}[this.page]
    document.querySelector('#bv-title').textContent = title
    const content = document.querySelector('#bv-content')
    content.innerHTML = ({dashboard:()=>this.dashboard(),profiles:()=>this.profiles(),measurements:()=>this.measurements(),capture:()=>this.capture(),viewer:()=>this.viewer(),analytics:()=>this.analytics(),simulations:()=>this.simulations(),reports:()=>this.reports(),admin:()=>this.admin()})[this.page]()
  }
  kpi(label, value, note) { return `<article class="bv-kpi"><div><span>${label}</span><strong>${value}</strong></div><small>${note}</small></article>` }
  dashboard() {
    const active = this.data.profiles.filter(p=>p.status==='active').length
    setTimeout(()=>this.bindDashboard(),0)
    return `<div class="bv-kpis">${this.kpi('Expedientes activos',active,'Datos locales demostrativos')}${this.kpi('Mediciones',this.data.measurements.length,'Historial observado')}${this.kpi('Capturas',this.data.media.length,'Estado privado')}${this.kpi('Simulaciones',this.data.simulations.length,'Separadas de observaciones')}</div>
      <div class="bv-grid"><article class="bv-card bv-wide"><h3>Actividad reciente</h3><div class="bv-feed">${this.data.audit.slice(-5).reverse().map(a=>`<div><i>✓</i><span><b>${escapeHtml(a.action)}</b><small>${escapeHtml(a.time)} · ${escapeHtml(a.outcome)}</small></span></div>`).join('')}</div></article>
      <article class="bv-card"><h3>Accesos rápidos</h3><div class="bv-actions"><button data-go="profiles">Nuevo expediente</button><button data-go="measurements">Registrar medición</button><button data-go="capture">Nueva captura</button><button data-go="viewer">Abrir visor 3D</button></div></article></div>`
  }
  bindDashboard(){ document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>this.open(b.dataset.go))) }
  profiles() {
    setTimeout(()=>this.bindProfiles(),0)
    return `<div class="bv-toolbar"><button class="bv-primary" id="bv-new-profile">+ Nuevo expediente</button><label class="bv-search"><span>⌕</span><input id="profile-search" placeholder="Buscar por código o nombre"></label></div>
      <article class="bv-card"><div class="bv-table-wrap"><table><thead><tr><th>Código</th><th>Expediente</th><th>Estado</th><th>Consentimiento</th><th>Acciones</th></tr></thead><tbody id="profile-rows">${this.profileRows()}</tbody></table></div></article>`
  }
  profileRows(filter='') { return this.data.profiles.filter(p=>`${p.id} ${p.name}`.toLowerCase().includes(filter.toLowerCase())).map(p=>`<tr><td><b>${escapeHtml(p.id)}</b></td><td>${escapeHtml(p.name)}<small>${p.age ? p.age+' años':'Edad no registrada'}</small></td><td><span class="bv-status ${p.status}">${p.status}</span></td><td><span class="bv-status ${p.consent?'active':'pending'}">${p.consent?'Aceptado':'Pendiente'}</span></td><td><button class="bv-text" data-profile="${p.id}">Abrir</button></td></tr>`).join('') || '<tr><td colspan="5" class="bv-empty">No hay expedientes que coincidan.</td></tr>' }
  bindProfiles(){
    document.querySelector('#bv-new-profile')?.addEventListener('click',()=>this.newProfile())
    document.querySelector('#profile-search')?.addEventListener('input',(e)=>document.querySelector('#profile-rows').innerHTML=this.profileRows(e.target.value))
  }
  newProfile(){
    const name=prompt('Nombre del expediente de demostración'); if(!name)return
    const n=this.data.profiles.length+1, id=`BV-${String(n).padStart(3,'0')}`
    this.data.profiles.push({id,name:name.trim(),status:'active',age:null,created:new Date().toISOString().slice(0,10),consent:false})
    this.audit(`Expediente ${id} creado`); this.save(); this.render()
  }
  measurements(){
    setTimeout(()=>this.bindMeasurements(),0)
    const options=this.data.profiles.map(p=>`<option value="${p.id}">${p.id} · ${escapeHtml(p.name)}</option>`).join('')
    return `<div class="bv-grid measurements"><article class="bv-card"><h3>Registrar medición observada</h3><form id="measurement-form" class="bv-form"><label>Expediente<select name="profile" required>${options}</select></label><label>Métrica<input name="metric" required placeholder="Ej. Estatura"></label><div class="bv-two"><label>Valor<input name="value" type="number" step="0.01" required></label><label>Unidad<input name="unit" required placeholder="cm / kg"></label></div><label>Método<textarea name="method" required placeholder="Instrumento y procedimiento"></textarea></label><button class="bv-primary">Guardar medición</button></form></article><article class="bv-card"><h3>Historial</h3><div class="bv-table-wrap"><table><thead><tr><th>Métrica</th><th>Valor</th><th>Fecha</th><th>Método</th></tr></thead><tbody>${this.data.measurements.slice().reverse().map(m=>`<tr><td>${escapeHtml(m.metric)}<small>${escapeHtml(m.profile)}</small></td><td><b>${m.value} ${escapeHtml(m.unit)}</b></td><td>${escapeHtml(m.date)}</td><td>${escapeHtml(m.method)}</td></tr>`).join('')}</tbody></table></div></article></div>`
  }
  bindMeasurements(){ document.querySelector('#measurement-form')?.addEventListener('submit',(e)=>{e.preventDefault();const d=new FormData(e.target);const m={id:'M-'+Date.now(),profile:d.get('profile'),metric:d.get('metric').trim(),value:+d.get('value'),unit:d.get('unit').trim(),method:d.get('method').trim(),date:new Date().toISOString().slice(0,10),author:'Especialista demo'};this.data.measurements.push(m);this.audit(`Medición ${m.metric} registrada`);this.save();this.render()}) }
  capture(){
    setTimeout(()=>this.bindCapture(),0)
    return `<div class="bv-grid"><article class="bv-card"><h3>Carga de demostración</h3><p class="bv-disclaimer">Esta interfaz valida el archivo localmente. No realiza almacenamiento privado ni análisis de pose sin los servicios backend definidos en el documento.</p><form class="bv-form" id="capture-form"><label>Expediente<select id="capture-profile">${this.data.profiles.map(p=>`<option value="${p.id}">${p.id}</option>`).join('')}</select></label><label>Imagen<input id="capture-file" type="file" accept="image/jpeg,image/png"></label><div id="capture-preview" class="bv-upload">Seleccione una imagen JPG o PNG</div><button class="bv-primary">Validar captura</button></form></article><article class="bv-card"><h3>Control de calidad</h3><ul class="bv-checks"><li>Formato y tamaño real</li><li>Encuadre y orientación</li><li>Iluminación uniforme</li><li>Consentimiento vigente</li><li>Revisión humana para baja calidad</li></ul></article></div>`
  }
  bindCapture(){
    const file=document.querySelector('#capture-file'), preview=document.querySelector('#capture-preview'), form=document.querySelector('#capture-form')
    file?.addEventListener('change',()=>{const f=file.files[0];if(!f)return;preview.textContent=f.type.startsWith('image/')?`${f.name} · ${(f.size/1024/1024).toFixed(2)} MB`:'Tipo no permitido'})
    form?.addEventListener('submit',(e)=>{e.preventDefault();const f=file.files[0];if(!f||!['image/jpeg','image/png'].includes(f.type)||f.size>10*1024*1024){preview.textContent='Rechazada: use JPG/PNG de hasta 10 MB';return}const id='IMG-'+Date.now();this.data.media.push({id,profile:document.querySelector('#capture-profile').value,name:f.name,status:'ready'});this.audit(`Captura ${id} validada localmente`);this.save();preview.innerHTML=`<b>Validada localmente</b><br>La subida privada queda pendiente del backend.`})
  }
  viewer(){ setTimeout(()=>document.querySelector('#bv-open-viewer')?.addEventListener('click',()=>this.close()),0); return `<article class="bv-card viewer-card"><div class="bv-viewer-icon">◇</div><h3>Visor anatómico interactivo</h3><p>Usa los modelos 3D existentes, superficies, aislamiento, vistas y controles de cámara disponibles en el atlas.</p><button class="bv-primary" id="bv-open-viewer">Abrir visor 3D</button></article>` }
  analytics(){
    const height=this.data.measurements.filter(m=>m.metric.toLowerCase().includes('estatura'))
    const weight=this.data.measurements.filter(m=>m.metric.toLowerCase().includes('peso'))
    setTimeout(()=>{document.querySelector('#bv-open-sim')?.addEventListener('click',()=>this.open('simulations'))},0)
    return `<div class="bv-grid"><article class="bv-card bv-wide"><h3>Serie temporal</h3>${this.chart(height,'Estatura','cm')} ${this.chart(weight,'Peso','kg')}<small class="bv-foot">Comparaciones solamente entre unidades y métodos compatibles. Los datos faltantes no se interpolan.</small></article><article class="bv-card"><h3>Resumen</h3><div class="bv-stat"><span>Registros observados</span><b>${this.data.measurements.length}</b></div><div class="bv-stat"><span>Series disponibles</span><b>${new Set(this.data.measurements.map(m=>m.metric)).size}</b></div><button class="bv-primary" id="bv-open-sim">Crear escenario hipotético</button></article></div>`
  }
  chart(rows,title,unit){ if(!rows.length)return `<div class="bv-chart-empty">Sin datos de ${escapeHtml(title)}</div>`;const max=Math.max(...rows.map(r=>r.value)),min=Math.min(...rows.map(r=>r.value));const pts=rows.map((r,i)=>{const x=rows.length===1?50:5+i*90/(rows.length-1);const y=90-((r.value-min)/(max-min||1))*70;return`${x},${y}`}).join(' ');return `<div class="bv-chart"><div><span>${escapeHtml(title)} (${escapeHtml(unit)})</span><b>${rows.at(-1).value} ${escapeHtml(unit)}</b></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts}"/><circle cx="${pts.split(' ').at(-1)?.split(',')[0]||50}" cy="${pts.split(' ').at(-1)?.split(',')[1]||50}" r="2"/></svg></div>` }
  simulations(){
    setTimeout(()=>this.bindSimulation(),0)
    return `<article class="bv-card bv-sim"><div class="bv-sim-head"><span>SIMULACIÓN · HIPOTÉTICA</span><h3>Escenario de demostración</h3></div><p>Los parámetros siguientes son ejemplos visuales y no representan una transformación anatómica clínicamente válida.</p><form id="simulation-form" class="bv-form"><div class="bv-two"><label>Referencia base<select name="base"><option>BV-001 · Estatura 170 cm</option></select></label><label>Factor visual (%)<input name="factor" type="number" min="90" max="110" value="100"></label></div><button class="bv-primary">Generar escenario</button></form><div id="simulation-result">${this.data.simulations.length?`<h4>Último escenario</h4><div class="bv-comparison"><span>Base: <b>100%</b></span><span>Hipótesis: <b>${this.data.simulations.at(-1).factor}%</b></span></div>`:'<div class="bv-empty">Todavía no existe una simulación.</div>'}</div></article>`
  }
  bindSimulation(){ document.querySelector('#simulation-form')?.addEventListener('submit',(e)=>{e.preventDefault();const d=new FormData(e.target),factor=+d.get('factor');if(factor<90||factor>110)return;this.data.simulations.push({id:'SIM-'+Date.now(),base:'BV-001',factor,created:new Date().toISOString()});this.audit('Escenario hipotético creado');this.save();this.render()}) }
  reports(){
    setTimeout(()=>this.bindReports(),0)
    return `<article class="bv-card"><h3>Generar reporte trazable</h3><p>Incluye fuentes, periodo, mediciones observadas, limitaciones y advertencias. Exportación local en CSV.</p><div class="bv-report-actions"><button class="bv-primary" id="bv-report-csv">Exportar mediciones CSV</button><button class="bv-primary" id="bv-report-preview">Vista previa</button></div><div id="report-preview"></div></article>`
  }
  bindReports(){
    document.querySelector('#bv-report-csv')?.addEventListener('click',()=>{const head='Codigo,Expediente,Metrica,Valor,Unidad,Fecha,Metodo,Autor\n';const csv=head+this.data.measurements.map(m=>[m.profile,m.profile,m.metric,m.value,m.unit,m.date,m.method,m.author].map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='bodyvision-mediciones.csv';a.click();URL.revokeObjectURL(a.href);this.audit('Reporte CSV exportado')})
    document.querySelector('#bv-report-preview')?.addEventListener('click',()=>document.querySelector('#report-preview').innerHTML=`<div class="bv-report"><h2>Reporte BODYVISION AI</h2><p>Fecha: ${new Date().toLocaleString()} · Responsable: Especialista demo</p><h4>Mediciones observadas</h4><ul>${this.data.measurements.map(m=>`<li>${escapeHtml(m.metric)}: ${m.value} ${escapeHtml(m.unit)} (${escapeHtml(m.date)} · ${escapeHtml(m.method)})</li>`).join('')}</ul><h4>Limitaciones</h4><p>Uso educativo. No constituye dispositivo médico ni análisis clínico.</p></div>`)
  }
  admin(){
    return `<div class="bv-grid"><article class="bv-card"><h3>Usuarios y roles</h3><div class="bv-user-row"><b>Especialista demo</b><span class="bv-status active">Especialista</span></div><div class="bv-user-row"><b>Administrador demo</b><span class="bv-status pending">Administrador</span></div><p class="bv-disclaimer">La seguridad completa, RBAC por recurso y autenticación requieren backend.</p></article><article class="bv-card"><h3>Auditoría</h3><div class="bv-feed">${this.data.audit.slice(-8).reverse().map(a=>`<div><i>•</i><span><b>${escapeHtml(a.action)}</b><small>${escapeHtml(a.time)} · ${escapeHtml(a.outcome)}</small></span></div>`).join('')}</div></article></div>`
  }
  audit(action){ this.data.audit.push({action,time:new Date().toLocaleString('es-PE',{hour12:false}),outcome:'Éxito'}) }
}
