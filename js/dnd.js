// DnD helpers (clonar dados ao arrastar)
let currentData = null;

function makeDraggable(el, data){
  el.draggable = true;
  el.addEventListener('dragstart', (e)=>{
    currentData = data;
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copyMove';
  });
}

function setupDropzone(zone, onDrop){
  zone.addEventListener('dragover', (e)=>{
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', ()=> zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e)=>{
    e.preventDefault();
    zone.classList.remove('drag-over');
    let payload = currentData;
    try{ payload = JSON.parse(e.dataTransfer.getData('text/plain')) }catch{}
    onDrop(payload, e);
  });
}

// Export functions to global scope
window.makeDraggable = makeDraggable;
window.setupDropzone = setupDropzone;
window.DND = { makeDraggable, setupDropzone };
console.log('DND functions defined:', typeof makeDraggable, typeof setupDropzone);
