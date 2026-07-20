const OLD_KEY='travelGoDataV1';
const KEY='travelGoPlansV2';
const SUPABASE_URL='https://zxxlwixnwtyqsjpgzbth.supabase.co';
const SUPABASE_KEY='sb_publishable_OIQR0jdz5wx73zbdCuOyUA_yXtw5y2k';
function parseLiveInvite(){try{const value=new URLSearchParams(location.hash.slice(1)).get('live');if(!value)return null;const [id,viewerToken]=value.split('.');return id&&viewerToken?{id,viewerToken}:null}catch{return null}}
async function supabaseRpc(name,body){const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text()||`Supabase ${response.status}`);const text=await response.text();return text?JSON.parse(text):null}
function publicPlan(plan){const copy=clone(plan);delete copy.liveShare;return copy}
const $=s=>document.querySelector(s);
const won=n=>Number(n||0).toLocaleString('ko-KR')+'원';
let installPrompt=null;
const clone=x=>JSON.parse(JSON.stringify(x));
function decodeSharedPlan(){try{const raw=new URLSearchParams(location.hash.slice(1)).get('share');if(!raw)return null;const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));const plan=JSON.parse(new TextDecoder().decode(bytes));return plan?.trip?plan:null}catch{return null}}
function encodePlan(plan){const bytes=new TextEncoder().encode(JSON.stringify(plan));let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary)}
const baseTrip={title:'제주도 가족 여행',start:'2026-08-03',end:'2026-08-06',people:4,budget:0};
const sample={trip:baseTrip,schedules:[{id:1,date:'2026-08-03',time:'10:00',title:'공항 도착 및 렌터카',place:'제주국제공항'},{id:2,date:'2026-08-03',time:'13:00',title:'고기국수 점심',place:'제주시'},{id:3,date:'2026-08-04',time:'09:30',title:'성산일출봉 산책',place:'성산읍'}],packing:[{id:1,name:'신분증',done:true},{id:2,name:'충전기와 보조배터리',done:false},{id:3,name:'선크림과 모자',done:false},{id:4,name:'상비약',done:true}],expenses:[{id:1,category:'교통',name:'항공권',amount:480000},{id:2,category:'숙박',name:'가족 펜션',amount:390000},{id:3,category:'식비',name:'식사 예산',amount:300000}],board:[]};
const liveInvite=parseLiveInvite();
const sharedPlan=decodeSharedPlan();
const readOnly=Boolean(sharedPlan||liveInvite);
let state=liveInvite?{activeId:1,plans:[{...clone(sample),id:1}]}:readOnly?{activeId:sharedPlan.id||1,plans:[sharedPlan]}:loadState();
let data=currentPlan();
let mode='';
let editing=null;
let draggedScheduleId=null;
let scheduleDate='all';

function loadState(){
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.plans?.length)return saved}catch{}
  let first=clone(sample);
  try{const old=JSON.parse(localStorage.getItem(OLD_KEY));if(old?.trip)first={...first,...old,board:old.board||[]}}catch{}
  first.id=Date.now();first.createdAt=new Date().toISOString();
  const initial={activeId:first.id,plans:[first]};localStorage.setItem(KEY,JSON.stringify(initial));return initial;
}
function currentPlan(){return state.plans.find(x=>x.id===state.activeId)||state.plans[0]}
let liveSyncTimer=null;
function scheduleLiveSync(){if(readOnly||!currentPlan()?.liveShare)return;clearTimeout(liveSyncTimer);liveSyncTimer=setTimeout(async()=>{const plan=currentPlan();try{const ok=await supabaseRpc('update_trip_share',{p_id:plan.liveShare.id,p_owner_token:plan.liveShare.ownerToken,p_payload:publicPlan(plan)});if(!ok)throw new Error('공유 권한을 확인할 수 없습니다.')}catch(error){console.error('Supabase sync failed',error);setTimeout(scheduleLiveSync,10000)}},700)}
function persist(){if(!readOnly)localStorage.setItem(KEY,JSON.stringify(state));render();scheduleLiveSync()}
function newBlankPlan(trip){return{id:Date.now(),createdAt:new Date().toISOString(),trip,schedules:[],packing:[],expenses:[],board:[]}}
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
  renderScheduleFilters();renderSchedules();renderPacking();renderExpenses(total);renderBoard();renderTripList();
}
function localYmd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function tripDates(){const out=[];let d=new Date(data.trip.start+'T00:00:00'),end=new Date(data.trip.end+'T00:00:00');while(d<=end&&out.length<32){out.push(localYmd(d));d.setDate(d.getDate()+1)}return [...new Set([...out,...data.schedules.map(x=>x.date)])].filter(Boolean).sort()}
function renderScheduleFilters(){const el=$('#scheduleFilters');const dates=tripDates();if(scheduleDate!=='all'&&!dates.includes(scheduleDate))scheduleDate='all';el.innerHTML=`<button class="filter-tab ${scheduleDate==='all'?'active':''}" data-sdate="all">전체 일정</button>`+dates.map((d,i)=>`<button class="filter-tab ${scheduleDate===d?'active':''}" data-sdate="${d}">${i+1}일차 · ${dateText(d)}</button>`).join('')}
function schedulePosition(x){return Number.isFinite(Number(x.order))?Number(x.order):data.schedules.indexOf(x)}
function orderedSchedules(){return [...data.schedules].sort((a,b)=>a.date.localeCompare(b.date)||schedulePosition(a)-schedulePosition(b)||a.time.localeCompare(b.time))}
function normalizeDayOrder(date){orderedSchedules().filter(x=>x.date===date).forEach((x,i)=>x.order=i)}
function renderSchedules(){const el=$('#scheduleList');el.innerHTML='';const items=orderedSchedules().filter(x=>scheduleDate==='all'||x.date===scheduleDate);if(!items.length)return empty(el,scheduleDate==='all'?'아직 등록된 일정이 없어요.':'이 날짜에는 등록된 일정이 없어요.');items.forEach((x,index)=>{const dayItems=items.filter(y=>y.date===x.date);const dayIndex=dayItems.findIndex(y=>y.id===x.id);el.insertAdjacentHTML('beforeend',`<article class="schedule-item" data-schedule-id="${x.id}" draggable="${readOnly?'false':'true'}"><div class="schedule-sort"><span class="drag-handle" title="끌어서 순서 변경">⠿</span><button data-move-schedule="up" data-id="${x.id}" ${dayIndex===0?'disabled':''} aria-label="일정 위로 이동">↑</button><button data-move-schedule="down" data-id="${x.id}" ${dayIndex===dayItems.length-1?'disabled':''} aria-label="일정 아래로 이동">↓</button></div><button class="edit" data-edit="schedule" data-id="${x.id}" aria-label="일정 수정">✎</button><button class="delete" data-del="schedule" data-id="${x.id}" aria-label="일정 삭제">×</button><time>${dateText(x.date)} ${x.time}</time><h3>${esc(x.title)}</h3><p>📍 ${esc(x.place||'장소 미정')}</p>${x.place?`<div class="map-links"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.place)}" target="_blank" rel="noopener">🌐 Google 지도에서 보기</a></div>`:''}</article>`)})}
function renderPacking(){const el=$('#packingList');el.innerHTML='';if(!data.packing.length)return empty(el);data.packing.forEach(x=>el.insertAdjacentHTML('beforeend',`<label class="check-item ${x.done?'done':''}"><input type="checkbox" data-check="${x.id}" ${x.done?'checked':''} ${readOnly?'disabled':''}><span>${esc(x.name)}</span><span class="row-actions"><button class="edit" data-edit="packing" data-id="${x.id}" type="button" aria-label="준비물 수정">✎</button><button class="delete" data-del="packing" data-id="${x.id}" type="button" aria-label="준비물 삭제">×</button></span></label>`))}
const colors={교통:'#ff6b4a',숙박:'#ffd166',식비:'#4da8da',관광:'#58b894',기타:'#9b8ac4'};
function renderExpenses(total){const el=$('#expenseList');el.innerHTML='';if(!data.expenses.length){$('#expenseChart').style.background='#eee';return empty(el)}let at=0,parts=[];Object.entries(data.expenses.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+Number(x.amount),a),{})).forEach(([c,n])=>{const end=at+n/total*100;parts.push(`${colors[c]||colors.기타} ${at}% ${end}%`);at=end});$('#expenseChart').style.background=`conic-gradient(${parts.join(',')})`;data.expenses.forEach((x,index)=>el.insertAdjacentHTML('beforeend',`<div class="expense-row"><i style="background:${colors[x.category]||colors.기타}"></i><div><strong>${esc(x.name)}</strong><br><small>${esc(x.category)}${x.scheduleId?' · 일정 연동':''}</small></div><b>${won(x.amount)}</b><div class="row-actions"><button class="move-btn" data-move-expense="up" data-id="${x.id}" ${index===0?'disabled':''} aria-label="위로 이동">↑</button><button class="move-btn" data-move-expense="down" data-id="${x.id}" ${index===data.expenses.length-1?'disabled':''} aria-label="아래로 이동">↓</button><button class="edit" data-edit="expense" data-id="${x.id}" aria-label="경비 수정">✎</button><button class="delete" data-del="expense" data-id="${x.id}" aria-label="경비 삭제">×</button></div></div>`))}
function renderBoard(){const el=$('#boardList');el.innerHTML='';const items=[...data.board].sort((a,b)=>b.id-a.id);if(!items.length)return empty(el,'여행에 참고할 정보를 기록해 보세요.');items.forEach(x=>{const safeUrl=/^https?:\/\//i.test(x.url||'')?x.url:'';el.insertAdjacentHTML('beforeend',`<article class="board-card"><button class="delete" data-del="board" data-id="${x.id}" aria-label="정보 삭제">×</button><h3>${esc(x.title)}</h3><p>${esc(x.content)}</p>${safeUrl?`<a href="${esc(safeUrl)}" target="_blank" rel="noopener">관련 링크 열기 ↗</a>`:''}</article>`)})}
function renderTripList(){const el=$('#tripList');el.innerHTML='';[...state.plans].sort((a,b)=>String(b.trip.start).localeCompare(String(a.trip.start))).forEach(x=>{const today=new Date().toISOString().slice(0,10);const status=x.trip.end<today?'지난 여행':x.trip.start>today?'예정된 여행':'여행 중';el.insertAdjacentHTML('beforeend',`<article class="trip-card ${x.id===state.activeId?'active':''}"><div><h3>${esc(x.trip.title)} ${x.id===state.activeId?'<small>· 현재 열림</small>':''}</h3><p>${fullDate(x.trip.start)} — ${fullDate(x.trip.end)} · ${status}</p></div><div class="trip-actions"><button class="open-trip" data-trip="${x.id}">${x.id===state.activeId?'보고 있음':'열기'}</button><button class="delete-trip" data-trip-del="${x.id}" aria-label="여행 삭제">×</button></div></article>`)})}

const forms={
  trip:{title:'여행 정보 수정',fields:[['title','여행 이름','text'],['start','출발일','date'],['end','도착일','date'],['people','인원','number'],['budget','목표 예산 (선택)','number']]},
  newTrip:{title:'새 여행 만들기',fields:[['title','여행 이름','text'],['start','출발일','date'],['end','도착일','date'],['people','인원','number'],['budget','목표 예산 (선택)','number']]},
  schedule:{title:'일정 추가',fields:[['date','날짜','date'],['time','시간','time'],['title','일정','text'],['place','장소','text'],['amount','예상 경비 (선택)','number'],['category','경비 분류','expenseSelect']]},
  packing:{title:'준비물 추가',fields:[['name','준비물','text']]},
  expense:{title:'지출 추가',fields:[['name','항목','text'],['amount','금액','number'],['category','분류','expenseSelect']]},
  board:{title:'여행 정보 등록',fields:[['title','제목','text'],['content','내용','textarea'],['url','관련 링크 (선택)','url']]}
};
function fieldHtml([n,l,t]){let control='';if(t==='expenseSelect')control=`<select id="f_${n}" name="${n}">${Object.keys(colors).map(x=>`<option>${x}</option>`).join('')}</select>`;else if(t==='textarea')control=`<textarea id="f_${n}" name="${n}" rows="5" required></textarea>`;else control=`<input id="f_${n}" name="${n}" type="${t}" ${n==='amount'||n==='url'||n==='budget'?'':'required'}>`;return `<div class="field"><label for="f_${n}">${l}</label>${control}</div>`}
function openModal(type){editing=null;mode=type;const f=forms[type];$('#modalTitle').textContent=f.title;$('#modalFields').innerHTML=f.fields.map(fieldHtml).join('');if(type==='trip')Object.entries(data.trip).forEach(([k,v])=>{const i=$(`[name="${k}"]`);if(i)i.value=v});if(type==='schedule'){$('[name="date"]').value=scheduleDate==='all'?data.trip.start:scheduleDate}$('#modal').showModal()}
function openEdit(type,id){openModal(type);editing={type,id:Number(id)};$('#modalTitle').textContent={schedule:'일정 수정',expense:'여행 경비 수정',packing:'준비물 수정'}[type];const item=data[type==='schedule'?'schedules':type==='expense'?'expenses':'packing'].find(x=>x.id==id);if(!item)return;let values={...item};if(type==='schedule'){const linked=data.expenses.find(x=>x.scheduleId==id);values.amount=linked?.amount||'';values.category=linked?.category||'기타'}Object.entries(values).forEach(([k,v])=>{const input=$(`[name="${k}"]`);if(input)input.value=v})}

document.addEventListener('click',e=>{
  if(readOnly&&e.target.closest('[data-open],[data-edit],[data-del],[data-trip-del],[data-move-expense],[data-move-schedule]'))return;
  const scheduleMove=e.target.closest('[data-move-schedule]');if(scheduleMove){const item=data.schedules.find(x=>x.id==scheduleMove.dataset.id);const day=orderedSchedules().filter(x=>x.date===item.date);const index=day.findIndex(x=>x.id===item.id);const next=scheduleMove.dataset.moveSchedule==='up'?index-1:index+1;if(next>=0&&next<day.length){normalizeDayOrder(item.date);const a=data.schedules.find(x=>x.id===day[index].id),b=data.schedules.find(x=>x.id===day[next].id);[a.order,b.order]=[b.order,a.order];persist()}}
  const move=e.target.closest('[data-move-expense]');if(move){const index=data.expenses.findIndex(x=>x.id==move.dataset.id);const next=move.dataset.moveExpense==='up'?index-1:index+1;if(index>=0&&next>=0&&next<data.expenses.length){[data.expenses[index],data.expenses[next]]=[data.expenses[next],data.expenses[index]];persist()}}
  const open=e.target.closest('[data-open]');if(open)openModal(open.dataset.open);
  const edit=e.target.closest('[data-edit]');if(edit){e.preventDefault();openEdit(edit.dataset.edit,edit.dataset.id)}
  const date=e.target.closest('[data-sdate]');if(date){scheduleDate=date.dataset.sdate;renderScheduleFilters();renderSchedules()}
  const switcher=e.target.closest('[data-trip]');if(switcher){state.activeId=Number(switcher.dataset.trip);data=currentPlan();scheduleDate='all';persist();$('#tripListModal').close()}
  const tripDel=e.target.closest('[data-trip-del]');if(tripDel){if(state.plans.length===1)return alert('여행 기록은 최소 한 개가 필요해요.');if(confirm('이 여행과 모든 기록을 삭제할까요?')){const id=Number(tripDel.dataset.tripDel);state.plans=state.plans.filter(x=>x.id!==id);if(state.activeId===id)state.activeId=state.plans[0].id;persist()}}
  const del=e.target.closest('[data-del]');if(del){e.preventDefault();const labels={schedule:'일정',expense:'경비',packing:'준비물',board:'여행 정보'};if(!confirm(`${labels[del.dataset.del]||'항목'}을(를) 삭제할까요?`))return;if(del.dataset.del==='schedule')data.expenses=data.expenses.filter(x=>x.scheduleId!=del.dataset.id);data[del.dataset.del==='schedule'?'schedules':del.dataset.del==='expense'?'expenses':del.dataset.del]=data[del.dataset.del==='schedule'?'schedules':del.dataset.del==='expense'?'expenses':del.dataset.del].filter(x=>x.id!=del.dataset.id);persist()}
});
const scheduleList=$('#scheduleList');
scheduleList.addEventListener('dragstart',e=>{if(readOnly)return e.preventDefault();const item=e.target.closest('[data-schedule-id]');if(!item)return;draggedScheduleId=Number(item.dataset.scheduleId);item.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
scheduleList.addEventListener('dragover',e=>{const target=e.target.closest('[data-schedule-id]');const dragged=data.schedules.find(x=>x.id===draggedScheduleId);const over=data.schedules.find(x=>x.id==target?.dataset.scheduleId);if(!dragged||!over||dragged.date!==over.date||dragged.id===over.id)return;e.preventDefault();target.classList.add('drag-over')});
scheduleList.addEventListener('dragleave',e=>e.target.closest('[data-schedule-id]')?.classList.remove('drag-over'));
scheduleList.addEventListener('drop',e=>{e.preventDefault();const target=e.target.closest('[data-schedule-id]');const dragged=data.schedules.find(x=>x.id===draggedScheduleId);const over=data.schedules.find(x=>x.id==target?.dataset.scheduleId);if(!dragged||!over||dragged.date!==over.date||dragged.id===over.id)return;normalizeDayOrder(dragged.date);const day=orderedSchedules().filter(x=>x.date===dragged.date);const from=day.findIndex(x=>x.id===dragged.id),to=day.findIndex(x=>x.id===over.id);day.splice(to,0,day.splice(from,1)[0]);day.forEach((x,i)=>x.order=i);draggedScheduleId=null;persist()});
scheduleList.addEventListener('dragend',()=>{draggedScheduleId=null;scheduleList.querySelectorAll('.dragging,.drag-over').forEach(x=>x.classList.remove('dragging','drag-over'))});
document.addEventListener('change',e=>{if(readOnly)return render();if(e.target.dataset.check){data.packing.find(x=>x.id==e.target.dataset.check).done=e.target.checked;persist()}});
$('#editTripBtn').onclick=()=>openModal('trip');
$('#resetBtn').onclick=()=>openModal('newTrip');
$('#shareBtn').onclick=async()=>{try{$('#shareBtn').disabled=true;$('#shareBtn').textContent='링크 준비 중…';let meta=data.liveShare;if(!meta){const created=await supabaseRpc('create_trip_share',{p_payload:publicPlan(data)});const row=Array.isArray(created)?created[0]:created;if(!row?.id)throw new Error('공유 정보를 만들지 못했습니다.');meta=data.liveShare={id:row.id,ownerToken:row.owner_token,viewerToken:row.viewer_token};localStorage.setItem(KEY,JSON.stringify(state))}else await supabaseRpc('update_trip_share',{p_id:meta.id,p_owner_token:meta.ownerToken,p_payload:publicPlan(data)});const base=location.protocol==='file:'?'https://nsg8739.github.io/travel-go-family/':location.href.split('#')[0];const link=`${base}#live=${meta.id}.${meta.viewerToken}`;let copied=false;try{await navigator.clipboard.writeText(link);copied=true}catch{const area=document.createElement('textarea');area.value=link;document.body.append(area);area.select();copied=document.execCommand('copy');area.remove()}if(!copied)prompt('아래 읽기 전용 가족 초대 링크를 복사하세요.',link);else alert('최신 내용이 자동 반영되는 읽기 전용 가족 초대 링크를 복사했습니다.')}catch(error){console.error(error);alert('실시간 공유를 시작하지 못했습니다. Supabase SQL 설정을 먼저 완료해 주세요.')}finally{$('#shareBtn').disabled=false;$('#shareBtn').textContent='🔗 가족 초대 링크'}};
$('#tripListBtn').onclick=()=>{$('#tripListModal').showModal()};
$('#closeTripList').onclick=()=>$('#tripListModal').close();
$('#exportBackup').onclick=()=>{const backup={app:'여행가자GO',version:1,exportedAt:new Date().toISOString(),activeId:state.activeId,plans:state.plans};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`여행가자GO_백업_${localYmd(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#importBackup').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const backup=JSON.parse(await file.text());if(backup.app!=='여행가자GO'||!Array.isArray(backup.plans)||!backup.plans.length||backup.plans.some(x=>!x.trip?.title||!Array.isArray(x.schedules)||!Array.isArray(x.packing)||!Array.isArray(x.expenses)))throw new Error('invalid');if(!confirm(`백업에 저장된 여행 ${backup.plans.length}개로 현재 기록을 교체할까요?`))return;state={activeId:backup.plans.some(x=>x.id===backup.activeId)?backup.activeId:backup.plans[0].id,plans:backup.plans.map(x=>({...x,board:Array.isArray(x.board)?x.board:[]}))};scheduleDate='all';persist();$('#tripListModal').close();alert('여행 기록을 복원했습니다.')}catch{alert('올바른 여행가자GO 백업 파일이 아닙니다.')}finally{e.target.value=''}};
$('#closeModal').onclick=$('#cancelModal').onclick=()=>$('#modal').close();
$('#modalForm').onsubmit=e=>{
  e.preventDefault();if(readOnly)return;const obj=Object.fromEntries(new FormData(e.target));
  if(mode==='trip')data.trip={...obj,people:Number(obj.people),budget:Number(obj.budget||0)};
  else if(mode==='newTrip'){const plan=newBlankPlan({...obj,people:Number(obj.people),budget:Number(obj.budget||0)});state.plans.push(plan);state.activeId=plan.id;scheduleDate='all'}
  else if(editing){
    if(mode==='packing'){const item=data.packing.find(x=>x.id===editing.id);item.name=obj.name}
    if(mode==='expense'){const item=data.expenses.find(x=>x.id===editing.id);Object.assign(item,{name:obj.name,amount:Number(obj.amount),category:obj.category})}
    if(mode==='schedule'){const item=data.schedules.find(x=>x.id===editing.id);const amount=Number(obj.amount);const category=obj.category;delete obj.amount;delete obj.category;Object.assign(item,obj);let linked=data.expenses.find(x=>x.scheduleId===editing.id);if(amount>0){if(linked)Object.assign(linked,{name:obj.title,amount,category});else data.expenses.push({id:Date.now(),scheduleId:editing.id,name:obj.title,amount,category})}else data.expenses=data.expenses.filter(x=>x.scheduleId!==editing.id)}
  }
  else{obj.id=Date.now();if(mode==='packing')obj.done=false;if(mode==='expense')obj.amount=Number(obj.amount);if(mode==='schedule'){const amount=Number(obj.amount);delete obj.amount;const category=obj.category;delete obj.category;obj.order=Math.max(-1,...data.schedules.filter(x=>x.date===obj.date).map(x=>schedulePosition(x)))+1;data.schedules.push(obj);if(amount>0)data.expenses.push({id:obj.id+1,scheduleId:obj.id,name:obj.title,amount,category})}else{const collections={packing:'packing',expense:'expenses',board:'board'};data[collections[mode]].push(obj)}}
  editing=null;persist();$('#modal').close();
};
if(liveInvite){loadLivePlan();setInterval(()=>loadLivePlan(true),10000)}else render();
async function loadLivePlan(silent=false){try{const payload=await supabaseRpc('read_trip_share',{p_id:liveInvite.id,p_viewer_token:liveInvite.viewerToken});if(!payload?.trip)throw new Error('초대 정보를 찾지 못했습니다.');payload.board=Array.isArray(payload.board)?payload.board:[];state={activeId:payload.id||1,plans:[payload]};data=currentPlan();render();$('#readOnlyBanner').textContent='읽기 전용 초대 화면입니다. 10초마다 최신 여행 내용을 자동으로 확인합니다.'}catch(error){console.error(error);if(!silent){render();$('#readOnlyBanner').textContent='초대 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;installPrompt=null});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js');
