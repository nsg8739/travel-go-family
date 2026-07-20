const OLD_KEY='travelGoDataV1';
const KEY='travelGoPlansV2';
const SUPABASE_URL='https://zxxlwixnwtyqsjpgzbth.supabase.co';
const SUPABASE_KEY='sb_publishable_OIQR0jdz5wx73zbdCuOyUA_yXtw5y2k';
const AUTH_KEY='travelGoAuthSession';
let authSession=(()=>{try{return JSON.parse(localStorage.getItem(AUTH_KEY))}catch{return null}})();
async function authRequest(path,body,token){const response=await fetch(`${SUPABASE_URL}/auth/v1/${path}`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.msg||result.message||'인증 요청에 실패했습니다.');return result}
async function validSession(){if(!authSession)return null;if(authSession.expires_at*1000>Date.now()+60000)return authSession;try{const refreshed=await authRequest('token?grant_type=refresh_token',{refresh_token:authSession.refresh_token});authSession=refreshed;localStorage.setItem(AUTH_KEY,JSON.stringify(authSession));return authSession}catch{authSession=null;localStorage.removeItem(AUTH_KEY);return null}}
async function authRpc(name,body={}){const session=await validSession();if(!session)throw new Error('관리자 로그인이 필요합니다.');const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text()||`Supabase ${response.status}`);const text=await response.text();return text?JSON.parse(text):null}
function setAuthSession(session){authSession=session;session?localStorage.setItem(AUTH_KEY,JSON.stringify(session)):localStorage.removeItem(AUTH_KEY);renderAuthState()}
function renderAuthState(){const logged=Boolean(authSession?.access_token);$('#authBtn').textContent=logged?'✓ 관리자 로그인됨':'🔐 관리자 로그인';$('#logoutBtn').hidden=!logged;$('#authMessage').textContent=logged?`${authSession.user?.email||'관리자'} 계정으로 연결됨`:''}
function parseLiveInvite(){try{const value=new URLSearchParams(location.hash.slice(1)).get('live');if(!value)return null;const [id,viewerToken]=value.split('.');return id&&viewerToken?{id,viewerToken}:null}catch{return null}}
async function supabaseRpc(name,body){const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text()||`Supabase ${response.status}`);const text=await response.text();return text?JSON.parse(text):null}
function publicPlan(plan){const copy=clone(plan);delete copy.liveShare;(copy.accommodations||[]).forEach(x=>{delete x.voucherId;delete x.voucherName});return copy}
const $=s=>document.querySelector(s);
const VOUCHER_DB='travelGoVouchers';
function voucherDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(VOUCHER_DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function saveVoucher(file,oldId){if(!file||!file.size)return oldId||null;if(file.type!=='application/pdf')throw new Error('PDF 파일만 등록할 수 있습니다.');if(file.size>15*1024*1024)throw new Error('바우처 파일은 15MB 이하만 등록할 수 있습니다.');const db=await voucherDb();const id=crypto.randomUUID();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');const store=tx.objectStore('files');store.put(file,id);if(oldId)store.delete(oldId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return id}
async function getVoucher(id){const db=await voucherDb();const file=await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});db.close();return file}
async function deleteVoucher(id){if(!id)return;const db=await voucherDb();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function openVoucher(id){try{const file=await getVoucher(id);if(!file)return alert('이 기기에 저장된 바우처 파일을 찾지 못했습니다.');const url=URL.createObjectURL(file);window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch{alert('바우처를 열지 못했습니다.') }}
const won=n=>Number(n||0).toLocaleString('ko-KR')+'원';
let installPrompt=null;
const clone=x=>JSON.parse(JSON.stringify(x));
function decodeSharedPlan(){try{const raw=new URLSearchParams(location.hash.slice(1)).get('share');if(!raw)return null;const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));const plan=JSON.parse(new TextDecoder().decode(bytes));return plan?.trip?plan:null}catch{return null}}
function encodePlan(plan){const bytes=new TextEncoder().encode(JSON.stringify(plan));let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary)}
const baseTrip={title:'제주도 가족 여행',start:'2026-08-03',end:'2026-08-06',people:4,budget:0};
const sample={trip:baseTrip,schedules:[{id:1,date:'2026-08-03',time:'10:00',title:'공항 도착 및 렌터카',place:'제주국제공항'},{id:2,date:'2026-08-03',time:'13:00',title:'고기국수 점심',place:'제주시'},{id:3,date:'2026-08-04',time:'09:30',title:'성산일출봉 산책',place:'성산읍'}],packing:[{id:1,name:'신분증',done:true},{id:2,name:'충전기와 보조배터리',done:false},{id:3,name:'선크림과 모자',done:false},{id:4,name:'상비약',done:true}],expenses:[{id:1,category:'교통',name:'항공권',amount:480000},{id:2,category:'숙박',name:'가족 펜션',amount:390000},{id:3,category:'식비',name:'식사 예산',amount:300000}],board:[],accommodations:[],shortcuts:[]};
const liveInvite=parseLiveInvite();
const sharedPlan=decodeSharedPlan();
const readOnly=Boolean(sharedPlan||liveInvite);
let state=liveInvite?{activeId:1,plans:[{...clone(sample),id:1}]}:readOnly?{activeId:sharedPlan.id||1,plans:[sharedPlan]}:loadState();
let data=currentPlan();
let mode='';
let editing=null;
let scheduleDate='all';
let activePage='dashboard';

function loadState(){
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.plans?.length){saved.plans.forEach(x=>{x.accommodations=Array.isArray(x.accommodations)?x.accommodations:[];x.shortcuts=Array.isArray(x.shortcuts)?x.shortcuts:[]});return saved}}catch{}
  let first=clone(sample);
  try{const old=JSON.parse(localStorage.getItem(OLD_KEY));if(old?.trip)first={...first,...old,board:old.board||[]}}catch{}
  first.id=Date.now();first.createdAt=new Date().toISOString();
  const initial={activeId:first.id,plans:[first]};localStorage.setItem(KEY,JSON.stringify(initial));return initial;
}
function currentPlan(){return state.plans.find(x=>x.id===state.activeId)||state.plans[0]}
let liveSyncTimer=null;
function scheduleLiveSync(){if(readOnly||!authSession||!currentPlan()?.liveShare)return;clearTimeout(liveSyncTimer);liveSyncTimer=setTimeout(async()=>{const plan=currentPlan();try{const ok=await authRpc('update_my_trip_share',{p_id:plan.liveShare.id,p_payload:publicPlan(plan)});if(!ok)throw new Error('계정의 여행이 아닙니다.')}catch(error){console.error('Supabase sync failed',error);setTimeout(scheduleLiveSync,10000)}},700)}
function persist(){if(!readOnly)localStorage.setItem(KEY,JSON.stringify(state));render();scheduleLiveSync()}
function newBlankPlan(trip){return{id:Date.now(),createdAt:new Date().toISOString(),trip,schedules:[],packing:[],expenses:[],board:[],accommodations:[],shortcuts:[]}}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function dateText(v){if(!v)return '';const d=new Date(v+'T00:00:00');return `${d.getMonth()+1}. ${d.getDate()}.`}
function fullDate(v){if(!v)return '';const d=new Date(v+'T00:00:00');return `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`}
function empty(el,text='아직 등록된 항목이 없어요.'){el.innerHTML=`<div class="empty"><span>✦</span><p>${text}</p></div>`}
function render(){
  data=currentPlan();
  document.body.classList.toggle('read-only',readOnly);
  $('#readOnlyBanner').hidden=!readOnly;
  $('#tripTitleView').textContent=data.trip.title;
  $('#tripMeta').textContent=`${fullDate(data.trip.start)} — ${dateText(data.trip.end)} · ${data.trip.people}명`;
  const days=Math.ceil((new Date(data.trip.start+'T00:00:00')-new Date().setHours(0,0,0,0))/86400000);
  $('#daysLeft').textContent=days>0?`D-${days}`:days===0?'D-DAY':'여행 완료';
  $('#scheduleCount').textContent=data.schedules.length+'개';
  const done=data.packing.filter(x=>x.done).length;const pct=data.packing.length?Math.round(done/data.packing.length*100):0;
  $('#packingProgress').textContent=pct+'%';$('#progressBar').style.width=pct+'%';$('#packingSummary').textContent=`(${done}/${data.packing.length})`;
  const total=data.expenses.reduce((a,x)=>a+Number(x.amount),0);$('#expenseTotal').textContent=won(total);$('#donutTotal').textContent=won(total);
  const budget=Number(data.trip.budget||0);const balance=budget-total;$('#budgetTarget').textContent=budget?won(budget):'미설정';$('#budgetSpent').textContent=won(total);$('#budgetBalanceLabel').textContent=budget&&balance<0?'초과 금액':'남은 예산';$('#budgetBalance').textContent=budget?won(Math.abs(balance)):'-';$('#budgetBalance').className=budget?(balance<0?'over':'safe'):'';
  renderScheduleFilters();renderRouteOverview();renderSchedules();renderPacking();renderExpenses(total);renderBoard();renderStays();renderShortcuts();renderTripList();
}
function localYmd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function tripDates(){const out=[];let d=new Date(data.trip.start+'T00:00:00'),end=new Date(data.trip.end+'T00:00:00');while(d<=end&&out.length<32){out.push(localYmd(d));d.setDate(d.getDate()+1)}return [...new Set([...out,...data.schedules.map(x=>x.date)])].filter(Boolean).sort()}
function renderScheduleFilters(){const el=$('#scheduleFilters');const dates=tripDates();if(scheduleDate!=='all'&&!dates.includes(scheduleDate))scheduleDate='all';el.innerHTML=`<button class="filter-tab ${scheduleDate==='all'?'active':''}" data-sdate="all">전체 일정</button>`+dates.map((d,i)=>`<button class="filter-tab ${scheduleDate===d?'active':''}" data-sdate="${d}">${i+1}일차 · ${dateText(d)}</button>`).join('')}
function googleRouteUrl(items,mode){const places=items.map(x=>x.place).filter(Boolean);if(places.length===1)return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(places[0])}`;const params=new URLSearchParams({api:'1',origin:places[0],destination:places.at(-1),travelmode:mode});if(places.length>2)params.set('waypoints',places.slice(1,-1).join('|'));return `https://www.google.com/maps/dir/?${params}`}
function renderRouteOverview(){const el=$('#routeOverview');const dates=scheduleDate==='all'?tripDates():[scheduleDate];const routes=dates.map(date=>({date,items:[...data.schedules].filter(x=>x.date===date&&x.place).sort((a,b)=>a.time.localeCompare(b.time))})).filter(x=>x.items.length);if(!routes.length){el.innerHTML=`<div class="route-empty">📍 장소를 입력하면 날짜별 이동 동선을 확인할 수 있어요.</div>`;return}el.innerHTML=routes.map((route,index)=>`<article class="route-card"><div class="route-head"><div><strong>${tripDates().indexOf(route.date)+1}일차 · ${dateText(route.date)}</strong><span>${route.items.length}곳</span></div><div class="route-modes"><a href="${googleRouteUrl(route.items,'driving')}" target="_blank" rel="noopener">🚗 자동차</a><a href="${googleRouteUrl(route.items,'walking')}" target="_blank" rel="noopener">🚶 도보</a><a href="${googleRouteUrl(route.items,'transit')}" target="_blank" rel="noopener">🚇 대중교통</a></div></div><ol>${route.items.map(x=>`<li><time>${esc(x.time)}</time><span>${esc(x.place)}</span><small>${esc(x.title)}</small></li>`).join('')}</ol></article>`).join('')}
function renderSchedules(){const el=$('#scheduleList');el.innerHTML='';const items=[...data.schedules].filter(x=>scheduleDate==='all'||x.date===scheduleDate).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));if(!items.length)return empty(el,scheduleDate==='all'?'아직 등록된 일정이 없어요.':'이 날짜에는 등록된 일정이 없어요.');items.forEach(x=>el.insertAdjacentHTML('beforeend',`<article class="schedule-item"><button class="edit" data-edit="schedule" data-id="${x.id}" aria-label="일정 수정">✎</button><button class="delete" data-del="schedule" data-id="${x.id}" aria-label="일정 삭제">×</button><time>${dateText(x.date)} ${x.time}</time><h3>${esc(x.title)}</h3><p>📍 ${esc(x.place||'장소 미정')}</p>${x.place?`<div class="map-links"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.place)}" target="_blank" rel="noopener">🌐 Google 지도에서 보기</a></div>`:''}</article>`))}
function renderPacking(){const el=$('#packingList');el.innerHTML='';if(!data.packing.length)return empty(el);data.packing.forEach(x=>el.insertAdjacentHTML('beforeend',`<label class="check-item ${x.done?'done':''}"><input type="checkbox" data-check="${x.id}" ${x.done?'checked':''} ${readOnly?'disabled':''}><span>${esc(x.name)}</span><span class="row-actions"><button class="edit" data-edit="packing" data-id="${x.id}" type="button" aria-label="준비물 수정">✎</button><button class="delete" data-del="packing" data-id="${x.id}" type="button" aria-label="준비물 삭제">×</button></span></label>`))}
const colors={교통:'#ff6b4a',숙박:'#ffd166',식비:'#4da8da',관광:'#58b894',기타:'#9b8ac4'};
function renderExpenses(total){const el=$('#expenseList');el.innerHTML='';if(!data.expenses.length){$('#expenseChart').style.background='#eee';return empty(el)}let at=0,parts=[];Object.entries(data.expenses.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+Number(x.amount),a),{})).forEach(([c,n])=>{const end=at+n/total*100;parts.push(`${colors[c]||colors.기타} ${at}% ${end}%`);at=end});$('#expenseChart').style.background=`conic-gradient(${parts.join(',')})`;data.expenses.forEach((x,index)=>el.insertAdjacentHTML('beforeend',`<div class="expense-row"><i style="background:${colors[x.category]||colors.기타}"></i><div><strong>${esc(x.name)}</strong><br><small>${esc(x.category)}${x.scheduleId?' · 일정 연동':''}</small></div><b class="amount">${won(x.amount)}</b><div class="row-actions"><button class="move-btn" data-move-expense="up" data-id="${x.id}" ${index===0?'disabled':''} aria-label="위로 이동">↑</button><button class="move-btn" data-move-expense="down" data-id="${x.id}" ${index===data.expenses.length-1?'disabled':''} aria-label="아래로 이동">↓</button><button class="edit" data-edit="expense" data-id="${x.id}" aria-label="경비 수정">✎</button><button class="delete" data-del="expense" data-id="${x.id}" aria-label="경비 삭제">×</button></div></div>`))}
function safeShortcutUrl(value){const url=String(value||'').trim();if(/^https?:\/\//i.test(url))return url;const match=url.match(/^([a-z][a-z0-9+.-]*):/i);if(!match)return '';const blocked=['javascript','data','file','vbscript','blob'];return blocked.includes(match[1].toLowerCase())?'':url}
function renderShortcuts(){const el=$('#shortcutList');el.innerHTML='';const items=data.shortcuts||[];if(!items.length)return empty(el,'여행 중 자주 사용하는 앱이나 사이트를 등록해 보세요.');items.forEach(x=>{const safeUrl=safeShortcutUrl(x.url);el.insertAdjacentHTML('beforeend',`<article class="shortcut-card"><div class="shortcut-actions"><button class="edit" data-edit="shortcut" data-id="${x.id}" aria-label="바로가기 수정">✎</button><button class="delete" data-del="shortcut" data-id="${x.id}" aria-label="바로가기 삭제">×</button></div>${safeUrl?`<a href="${esc(safeUrl)}"><span class="shortcut-icon">${esc(x.icon||'↗')}</span><span><strong>${esc(x.name)}</strong><small>앱 또는 웹 열기</small></span></a>`:`<div class="shortcut-invalid"><span class="shortcut-icon">⚠️</span><span><strong>${esc(x.name)}</strong><small>허용되지 않는 링크</small></span></div>`}</article>`)})}
function renderStays(){const el=$('#stayList');el.innerHTML='';const stays=data.accommodations||[];if(!stays.length)return empty(el,'등록된 숙소가 없어요.<br>예약한 숙소 정보를 한곳에 모아보세요.');[...stays].sort((a,b)=>String(a.checkin).localeCompare(String(b.checkin))).forEach(x=>{const safeUrl=/^https?:\/\//i.test(x.url||'')?x.url:'';el.insertAdjacentHTML('beforeend',`<article class="stay-card"><div class="stay-actions"><button class="edit" data-edit="stay" data-id="${x.id}" aria-label="숙소 수정">✎</button><button class="delete" data-del="stay" data-id="${x.id}" aria-label="숙소 삭제">×</button></div><h3>${esc(x.name)}</h3><div class="stay-dates"><div><span>체크인</span><strong>${fullDate(x.checkin)}${x.checkinTime?` <small>${esc(x.checkinTime)}</small>`:``}</strong></div><div><span>체크아웃</span><strong>${fullDate(x.checkout)}${x.checkoutTime?` <small>${esc(x.checkoutTime)}</small>`:``}</strong></div></div><div class="stay-detail">${x.address?`<p>📍 <b>${esc(x.address)}</b></p>`:''}${x.phone?`<p>☎ ${esc(x.phone)}</p>`:''}${x.booking?`<p>예약번호 · <b>${esc(x.booking)}</b></p>`:''}</div>${x.memo?`<div class="stay-memo">${esc(x.memo)}</div>`:''}<div class="stay-buttons">${x.voucherId&&!readOnly?`<button class="voucher-btn" data-voucher="${x.voucherId}">📄 ${esc(x.voucherName||'PDF 바우처 열기')}</button>`:''}${safeUrl?`<a class="stay-link" href="${esc(safeUrl)}" target="_blank" rel="noopener">숙소 상세 정보 보기 ↗</a>`:''}</div></article>`)})}
function renderBoard(){const el=$('#boardList');el.innerHTML='';const items=[...data.board].sort((a,b)=>b.id-a.id);if(!items.length)return empty(el,'여행에 참고할 정보를 기록해 보세요.');items.forEach(x=>{const safeUrl=/^https?:\/\//i.test(x.url||'')?x.url:'';el.insertAdjacentHTML('beforeend',`<article class="board-card"><button class="delete" data-del="board" data-id="${x.id}" aria-label="정보 삭제">×</button><h3>${esc(x.title)}</h3><p>${esc(x.content)}</p>${safeUrl?`<a href="${esc(safeUrl)}" target="_blank" rel="noopener">관련 링크 열기 ↗</a>`:''}</article>`)})}
function renderTripList(){const el=$('#tripList');el.innerHTML='';[...state.plans].sort((a,b)=>String(b.trip.start).localeCompare(String(a.trip.start))).forEach(x=>{const today=new Date().toISOString().slice(0,10);const status=x.trip.end<today?'지난 여행':x.trip.start>today?'예정된 여행':'여행 중';el.insertAdjacentHTML('beforeend',`<article class="trip-card ${x.id===state.activeId?'active':''}"><div><h3>${esc(x.trip.title)} ${x.id===state.activeId?'<small>· 현재 열림</small>':''}</h3><p>${fullDate(x.trip.start)} — ${fullDate(x.trip.end)} · ${status}</p></div><div class="trip-actions"><button class="open-trip" data-trip="${x.id}">${x.id===state.activeId?'보고 있음':'열기'}</button><button class="delete-trip" data-trip-del="${x.id}" aria-label="여행 삭제">×</button></div></article>`)})}

const forms={
  trip:{title:'여행 정보 수정',fields:[['title','여행 이름','text'],['start','출발일','date'],['end','도착일','date'],['people','인원','number'],['budget','목표 예산 (선택)','number']]},
  newTrip:{title:'새 여행 만들기',fields:[['title','여행 이름','text'],['start','출발일','date'],['end','도착일','date'],['people','인원','number'],['budget','목표 예산 (선택)','number']]},
  schedule:{title:'일정 추가',fields:[['date','날짜','date'],['time','시간','time'],['title','일정','text'],['place','장소','text'],['amount','예상 경비 (선택)','number'],['category','경비 분류','expenseSelect']]},
  packing:{title:'준비물 추가',fields:[['name','준비물','text']]},
  expense:{title:'지출 추가',fields:[['name','항목','text'],['amount','금액','number'],['category','분류','expenseSelect']]},
  stay:{title:'숙소 등록',fields:[['name','숙소 이름','text'],['checkin','체크인 날짜','date'],['checkinTime','체크인 시간','time'],['checkout','체크아웃 날짜','date'],['checkoutTime','체크아웃 시간','time'],['address','주소','text'],['phone','연락처 (선택)','text'],['booking','예약번호 (선택)','text'],['url','숙소 관련 링크 (선택)','url'],['voucher','PDF 바우처 (선택·15MB 이하)','filePdf'],['memo','메모 (선택)','textareaOptional']]},
  shortcut:{title:'앱 바로가기 추가',fields:[['name','앱 또는 서비스 이름','text'],['icon','표시 아이콘 (선택)','text'],['url','웹 주소 또는 앱 딥링크','appLink']]},
  board:{title:'여행 정보 등록',fields:[['title','제목','text'],['content','내용','textarea'],['url','관련 링크 (선택)','url']]}
};
function fieldHtml([n,l,t]){let control='';if(t==='expenseSelect')control=`<select id="f_${n}" name="${n}">${Object.keys(colors).map(x=>`<option>${x}</option>`).join('')}</select>`;else if(t==='textareaOptional')control=`<textarea id="f_${n}" name="${n}" rows="4"></textarea>`;else if(t==='textarea')control=`<textarea id="f_${n}" name="${n}" rows="5" required></textarea>`;else if(t==='filePdf')control=`<input id="f_${n}" name="${n}" type="file" accept="application/pdf,.pdf"><small class="field-note">PDF는 이 기기에 오프라인 저장됩니다.</small>`;else if(t==='appLink')control=`<input id="f_${n}" name="${n}" type="text" required placeholder="https:// 또는 googlemaps://"><small class="field-note">웹 주소나 앱에서 제공하는 딥링크를 입력하세요. 위험한 링크 형식은 자동 차단됩니다.</small>`;else if(t==='urlRequired')control=`<input id="f_${n}" name="${n}" type="url" required placeholder="https://">`;else control=`<input id="f_${n}" name="${n}" type="${t}" ${n==='amount'||n==='url'||n==='budget'||n==='phone'||n==='booking'?'':'required'}>`;return `<div class="field"><label for="f_${n}">${l}</label>${control}</div>`}
function openModal(type){editing=null;mode=type;const f=forms[type];$('#modalTitle').textContent=f.title;$('#modalFields').innerHTML=f.fields.map(fieldHtml).join('');if(type==='trip')Object.entries(data.trip).forEach(([k,v])=>{const i=$(`[name="${k}"]`);if(i)i.value=v});if(type==='schedule'){$('[name="date"]').value=scheduleDate==='all'?data.trip.start:scheduleDate}$('#modal').showModal()}
function openEdit(type,id){openModal(type);editing={type,id:Number(id)};$('#modalTitle').textContent={schedule:'일정 수정',expense:'여행 경비 수정',packing:'준비물 수정',stay:'숙소 정보 수정',shortcut:'바로가기 수정'}[type];const collection={schedule:'schedules',expense:'expenses',packing:'packing',stay:'accommodations',shortcut:'shortcuts'}[type];const item=data[collection].find(x=>x.id==id);if(!item)return;let values={...item};if(type==='schedule'){const linked=data.expenses.find(x=>x.scheduleId==id);values.amount=linked?.amount||'';values.category=linked?.category||'기타'}Object.entries(values).forEach(([k,v])=>{const input=$(`[name="${k}"]`);if(input)input.value=v})}

document.addEventListener('click',async e=>{
  if(readOnly&&e.target.closest('[data-open],[data-edit],[data-del],[data-trip-del],[data-move-expense]'))return;
  const voucher=e.target.closest('[data-voucher]');if(voucher){e.preventDefault();return openVoucher(voucher.dataset.voucher)}
  const move=e.target.closest('[data-move-expense]');if(move){const index=data.expenses.findIndex(x=>x.id==move.dataset.id);const next=move.dataset.moveExpense==='up'?index-1:index+1;if(index>=0&&next>=0&&next<data.expenses.length){[data.expenses[index],data.expenses[next]]=[data.expenses[next],data.expenses[index]];persist()}}
  const open=e.target.closest('[data-open]');if(open)openModal(open.dataset.open);
  const edit=e.target.closest('[data-edit]');if(edit){e.preventDefault();openEdit(edit.dataset.edit,edit.dataset.id)}
  const date=e.target.closest('[data-sdate]');if(date){scheduleDate=date.dataset.sdate;renderScheduleFilters();renderRouteOverview();renderSchedules()}
  const switcher=e.target.closest('[data-trip]');if(switcher){state.activeId=Number(switcher.dataset.trip);data=currentPlan();scheduleDate='all';persist();$('#tripListModal').close()}
  const tripDel=e.target.closest('[data-trip-del]');if(tripDel){if(state.plans.length===1)return alert('여행 기록은 최소 한 개가 필요해요.');if(confirm('이 여행과 모든 기록을 삭제할까요?')){const id=Number(tripDel.dataset.tripDel);state.plans=state.plans.filter(x=>x.id!==id);if(state.activeId===id)state.activeId=state.plans[0].id;persist()}}
  const del=e.target.closest('[data-del]');if(del){e.preventDefault();const labels={schedule:'일정',expense:'경비',packing:'준비물',board:'여행 정보',stay:'숙소 정보',shortcut:'앱 바로가기'};if(!confirm(`${labels[del.dataset.del]||'항목'}을(를) 삭제할까요?`))return;if(del.dataset.del==='schedule')data.expenses=data.expenses.filter(x=>x.scheduleId!=del.dataset.id);const collections={schedule:'schedules',expense:'expenses',packing:'packing',board:'board',stay:'accommodations',shortcut:'shortcuts'};const collection=collections[del.dataset.del];const removed=data[collection].find(x=>x.id==del.dataset.id);data[collection]=data[collection].filter(x=>x.id!=del.dataset.id);if(del.dataset.del==='stay'&&removed?.voucherId)await deleteVoucher(removed.voucherId);persist()}
});
document.addEventListener('change',e=>{if(readOnly)return render();if(e.target.dataset.check){data.packing.find(x=>x.id==e.target.dataset.check).done=e.target.checked;persist()}});
$('#editTripBtn').onclick=()=>openModal('trip');
$('#resetBtn').onclick=()=>openModal('newTrip');
function normalizeCloudPlan(plan){return{...plan,board:Array.isArray(plan.board)?plan.board:[],accommodations:Array.isArray(plan.accommodations)?plan.accommodations:[],shortcuts:Array.isArray(plan.shortcuts)?plan.shortcuts:[],schedules:Array.isArray(plan.schedules)?plan.schedules:[],packing:Array.isArray(plan.packing)?plan.packing:[],expenses:Array.isArray(plan.expenses)?plan.expenses:[]}}
async function connectAccountData(){
  const localPlans=[...state.plans];
  for(const plan of localPlans.filter(x=>x.liveShare?.ownerToken)){
    try{
      const claimed=await authRpc('claim_trip_share',{p_id:plan.liveShare.id,p_owner_token:plan.liveShare.ownerToken});
      if(claimed)delete plan.liveShare.ownerToken;
    }catch(error){
      if(!String(error.message).includes('PGRST202'))throw error;
      delete plan.liveShare;
    }
  }
  let rows=await authRpc('list_my_trip_shares');
  rows=Array.isArray(rows)?rows:[];
  if(!rows.length){
    for(const plan of localPlans){
      const created=await authRpc('create_my_trip_share',{p_payload:publicPlan(plan)});
      const row=Array.isArray(created)?created[0]:created;
      plan.liveShare={id:row.id,viewerToken:row.viewer_token};
    }
    state={activeId:localPlans[0].id,plans:localPlans};
    localStorage.setItem(KEY,JSON.stringify(state));
    for(const plan of localPlans)await authRpc('update_my_trip_share',{p_id:plan.liveShare.id,p_payload:publicPlan(plan)});
  }else{
    const plans=rows.map(row=>{const plan=normalizeCloudPlan(row.payload);plan.liveShare={id:row.id,viewerToken:row.viewer_token};return plan});
    state={activeId:plans[0].id,plans};
    localStorage.setItem(KEY,JSON.stringify(state));
  }
  data=currentPlan();scheduleDate='all';render();
}
async function ensureLiveShare(){if(!await validSession())throw new Error('관리자 로그인이 필요합니다.');let meta=data.liveShare;if(!meta){const created=await authRpc('create_my_trip_share',{p_payload:publicPlan(data)});const row=Array.isArray(created)?created[0]:created;if(!row?.id)throw new Error('공유 정보를 만들지 못했습니다.');meta=data.liveShare={id:row.id,viewerToken:row.viewer_token};localStorage.setItem(KEY,JSON.stringify(state))}else await authRpc('update_my_trip_share',{p_id:meta.id,p_payload:publicPlan(data)});return meta}
async function copyInvitation(link,message){let copied=false;try{await navigator.clipboard.writeText(link);copied=true}catch{const area=document.createElement('textarea');area.value=link;document.body.append(area);area.select();copied=document.execCommand('copy');area.remove()}if(copied)alert(message);else prompt('아래 링크를 복사하세요.',link)}
function publishedBase(){return location.protocol==='file:'?'https://nsg8739.github.io/travel-go-family/':location.href.split('#')[0]}
$('#shareBtn').onclick=async()=>{try{$('#shareBtn').disabled=true;$('#shareBtn').textContent='링크 준비 중…';const meta=await ensureLiveShare();await copyInvitation(`${publishedBase()}#live=${meta.id}.${meta.viewerToken}`,'최신 내용이 자동 반영되는 가족 읽기 전용 링크를 복사했습니다.')}catch(error){console.error(error);alert('가족 초대 링크를 만들지 못했습니다.')}finally{$('#shareBtn').disabled=false;$('#shareBtn').textContent='🔗 가족 초대 링크'}};
$('#tripListBtn').onclick=()=>$('#tripListModal').showModal();
$('#closeTripList').onclick=()=>$('#tripListModal').close();
$('#exportBackup').onclick=()=>{const backup={app:'여행가자GO',version:1,exportedAt:new Date().toISOString(),activeId:state.activeId,plans:state.plans};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`여행가자GO_백업_${localYmd(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#importBackup').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const backup=JSON.parse(await file.text());if(backup.app!=='여행가자GO'||!Array.isArray(backup.plans)||!backup.plans.length||backup.plans.some(x=>!x.trip?.title||!Array.isArray(x.schedules)||!Array.isArray(x.packing)||!Array.isArray(x.expenses)))throw new Error('invalid');if(!confirm(`백업에 저장된 여행 ${backup.plans.length}개로 현재 기록을 교체할까요?`))return;state={activeId:backup.plans.some(x=>x.id===backup.activeId)?backup.activeId:backup.plans[0].id,plans:backup.plans.map(x=>({...x,board:Array.isArray(x.board)?x.board:[],accommodations:Array.isArray(x.accommodations)?x.accommodations:[],shortcuts:Array.isArray(x.shortcuts)?x.shortcuts:[]}))};scheduleDate='all';persist();$('#tripListModal').close();alert('여행 기록을 복원했습니다.')}catch{alert('올바른 여행가자GO 백업 파일이 아닙니다.')}finally{e.target.value=''}};
$('#closeModal').onclick=$('#cancelModal').onclick=()=>$('#modal').close();
$('#modalForm').onsubmit=async e=>{
  e.preventDefault();if(readOnly)return;const obj=Object.fromEntries(new FormData(e.target));
  if(mode==='trip')data.trip={...obj,people:Number(obj.people),budget:Number(obj.budget||0)};
  else if(mode==='newTrip'){const plan=newBlankPlan({...obj,people:Number(obj.people),budget:Number(obj.budget||0)});state.plans.push(plan);state.activeId=plan.id;scheduleDate='all'}
  else if(editing){
    if(mode==='packing'){const item=data.packing.find(x=>x.id===editing.id);item.name=obj.name}
    if(mode==='expense'){const item=data.expenses.find(x=>x.id===editing.id);Object.assign(item,{name:obj.name,amount:Number(obj.amount),category:obj.category})}
    if(mode==='stay'){const item=data.accommodations.find(x=>x.id===editing.id);const file=obj.voucher;delete obj.voucher;if(file?.size){obj.voucherId=await saveVoucher(file,item.voucherId);obj.voucherName=file.name}Object.assign(item,obj)}
    if(mode==='shortcut'){const item=data.shortcuts.find(x=>x.id===editing.id);Object.assign(item,obj)}
    if(mode==='schedule'){const item=data.schedules.find(x=>x.id===editing.id);const amount=Number(obj.amount);const category=obj.category;delete obj.amount;delete obj.category;Object.assign(item,obj);let linked=data.expenses.find(x=>x.scheduleId===editing.id);if(amount>0){if(linked)Object.assign(linked,{name:obj.title,amount,category});else data.expenses.push({id:Date.now(),scheduleId:editing.id,name:obj.title,amount,category})}else data.expenses=data.expenses.filter(x=>x.scheduleId!==editing.id)}
  }
  else{obj.id=Date.now();if(mode==='packing')obj.done=false;if(mode==='expense')obj.amount=Number(obj.amount);if(mode==='stay'){const file=obj.voucher;delete obj.voucher;if(file?.size){obj.voucherId=await saveVoucher(file);obj.voucherName=file.name}}if(mode==='schedule'){const amount=Number(obj.amount);delete obj.amount;const category=obj.category;delete obj.category;data.schedules.push(obj);if(amount>0)data.expenses.push({id:obj.id+1,scheduleId:obj.id,name:obj.title,amount,category})}else{const collections={packing:'packing',expense:'expenses',board:'board',stay:'accommodations',shortcut:'shortcuts',shortcut:'shortcuts'};data[collections[mode]].push(obj)}}
  editing=null;persist();$('#modal').close();
};
function showPage(page){activePage=page;document.body.dataset.page=page;document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));document.querySelectorAll('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===page));window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();showPage(button.dataset.nav)}));
showPage(activePage);
if(liveInvite){loadLivePlan();setInterval(()=>loadLivePlan(true),10000)}else render();
async function loadLivePlan(silent=false){try{const invite=liveInvite;const payload=await supabaseRpc('read_trip_share',{p_id:invite.id,p_viewer_token:invite.viewerToken});if(!payload?.trip)throw new Error('초대 정보를 찾지 못했습니다.');payload.board=Array.isArray(payload.board)?payload.board:[];payload.accommodations=Array.isArray(payload.accommodations)?payload.accommodations:[];payload.shortcuts=Array.isArray(payload.shortcuts)?payload.shortcuts:[];state={activeId:payload.id||1,plans:[payload]};data=currentPlan();render();$('#readOnlyBanner').textContent='읽기 전용 초대 화면입니다. 10초마다 최신 여행 내용을 자동으로 확인합니다.'}catch(error){console.error(error);if(!silent){render();$('#readOnlyBanner').textContent='초대 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;installPrompt=null});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js');
$('#authBtn').onclick=()=>{$('#authModal').showModal();renderAuthState()};
$('#closeAuth').onclick=()=>$('#authModal').close();
$('#authForm').onsubmit=async e=>{e.preventDefault();const email=$('#authEmail').value.trim();const password=$('#authPassword').value;const message=$('#authMessage');try{message.textContent='로그인 중...';const session=await authRequest('token?grant_type=password',{email,password});setAuthSession(session);await connectAccountData();renderAuthState();$('#authModal').close();alert('로그인되었습니다. 이 계정으로 PC와 모바일에서 같은 여행을 관리할 수 있어요.')}catch(error){message.textContent=error.message||'로그인하지 못했습니다.'}};
$('#signupBtn').onclick=async()=>{const email=$('#authEmail').value.trim();const password=$('#authPassword').value;const message=$('#authMessage');if(!email||password.length<6){message.textContent='이메일과 6자 이상의 비밀번호를 입력해 주세요.';return}try{message.textContent='계정을 만드는 중...';const result=await authRequest('signup',{email,password});if(result.access_token){setAuthSession(result);await connectAccountData();renderAuthState();$('#authModal').close();alert('관리자 계정을 만들고 여행 데이터를 연결했습니다.')}else message.textContent='가입 확인 메일을 보냈습니다. 메일에서 확인한 뒤 로그인해 주세요.'}catch(error){message.textContent=error.message||'계정을 만들지 못했습니다.'}};
$('#logoutBtn').onclick=async()=>{if(!confirm('관리자 계정에서 로그아웃할까요?'))return;try{if(authSession?.access_token)await authRequest('logout',{},authSession.access_token)}catch(error){console.warn(error)}setAuthSession(null);renderAuthState();$('#authModal').close();alert('로그아웃했습니다.')};
validSession().then(async valid=>{renderAuthState();if(valid&&!readOnly){try{await connectAccountData()}catch(error){console.error('계정 데이터 연결 실패',error)}}});
