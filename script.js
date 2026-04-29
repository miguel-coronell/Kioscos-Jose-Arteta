
// 1. CONFIGURACIÓN Y ESTADO GLOBAL
let LOGO_BASE64 = "";
const imgLogo = new Image();
imgLogo.crossOrigin = "Anonymous";
imgLogo.src = 'https://lh3.googleusercontent.com/d/10kzjBUJdYomKRw_yIApoDVHL8ZTCoQaR'; // Reemplazar con URL real del logo
imgLogo.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = imgLogo.width; canvas.height = imgLogo.height;
    canvas.getContext("2d").drawImage(imgLogo, 0, 0);
    LOGO_BASE64 = canvas.toDataURL("image/png");
};

const DB = {
    MO: ["Mantenimiento Preventivo", "Construcción Kiosco", "Instalación Eléctrica", "Plomería", "Pintura General", "Diseño Arquitectónico", "Levantamiento Topográfico"],
    MAT: ["Palma Amarga (Bulto)", "Cemento (Saco 50kg)", "Varilla Corrugada (Und)", "Pintura (Galón)", "Cable Eléctrico (Metro)", "Tubería PVC (Und)"]
};

let FOTOS_DB = [];
let chartInstance = null;

// Inicialización Teléfono
const inputTel = document.querySelector("#c_tel");
const iti = window.intlTelInput(inputTel, {
    initialCountry: "co",
    separateDialCode: true,
    utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@21.2.7/build/js/utils.js",
});

// 2. LÓGICA DE FIRMA DIGITAL DOBLE (CANVAS)
const canvasFirma = document.getElementById('canvas-firma');
const ctxFirma = canvasFirma ? canvasFirma.getContext('2d') : null;
let isDrawing = false;

let firmaEmpresa = null;
let firmaCliente = null;
let esModoCliente = false; // False = Empresa, True = Cliente

function resizeCanvas() {
    if(!canvasFirma) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvasFirma.width = canvasFirma.offsetWidth * ratio;
    canvasFirma.height = canvasFirma.offsetHeight * ratio;
    ctxFirma.scale(ratio, ratio);
    ctxFirma.lineWidth = 3;
    ctxFirma.lineCap = 'round';
    ctxFirma.strokeStyle = '#1e293b';
    cargarFirmaActualEnCanvas(); // Recargar si cambia el tamaño
}
window.addEventListener("resize", resizeCanvas);
setTimeout(resizeCanvas, 100); // Init

function getCoordinates(event) {
    const rect = canvasFirma.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getCoordinates(e);
    ctxFirma.beginPath();
    ctxFirma.moveTo(pos.x, pos.y);
    if(e.cancelable) e.preventDefault();
}

function draw(e) {
    if (!isDrawing) return;
    const pos = getCoordinates(e);
    ctxFirma.lineTo(pos.x, pos.y);
    ctxFirma.stroke();
    if(e.cancelable) e.preventDefault();
}

function stopDrawing() { 
    if(!isDrawing) return;
    isDrawing = false;
    guardarFirmaActual(); // Guardar trazo automáticamente
}

if(canvasFirma) {
    canvasFirma.addEventListener('mousedown', startDrawing);
    canvasFirma.addEventListener('mousemove', draw);
    canvasFirma.addEventListener('mouseup', stopDrawing);
    canvasFirma.addEventListener('mouseout', stopDrawing);
    canvasFirma.addEventListener('touchstart', startDrawing, {passive: false});
    canvasFirma.addEventListener('touchmove', draw, {passive: false});
    canvasFirma.addEventListener('touchend', stopDrawing);
}

function cambiarFirmante() {
    const switchEl = document.getElementById('switch-firma');
    const labelEl = document.getElementById('label-firmante');
    
    guardarFirmaActual(); // Guardar la que se estaba haciendo

    esModoCliente = switchEl.checked;
    
    labelEl.innerText = esModoCliente ? "Firma: CLIENTE" : "Firma: EMPRESA";
    labelEl.style.color = esModoCliente ? "#556B2F" : "#475569";

    ctxFirma.clearRect(0, 0, canvasFirma.width, canvasFirma.height);
    cargarFirmaActualEnCanvas();
}

function guardarFirmaActual() {
    if (isSignatureEmpty(canvasFirma)) return;
    if (!esModoCliente) firmaEmpresa = canvasFirma.toDataURL("image/png");
    else firmaCliente = canvasFirma.toDataURL("image/png");
}

function cargarFirmaActualEnCanvas() {
    const firmaData = esModoCliente ? firmaCliente : firmaEmpresa;
    if (firmaData) {
        const img = new Image();
        img.src = firmaData;
        img.onload = () => ctxFirma.drawImage(img, 0, 0, canvasFirma.width / (window.devicePixelRatio||1), canvasFirma.height / (window.devicePixelRatio||1));
    }
}

function limpiarCanvas() {
    ctxFirma.clearRect(0, 0, canvasFirma.width, canvasFirma.height);
    if (!esModoCliente) firmaEmpresa = null;
    else firmaCliente = null;
}

// 3. NAVEGACIÓN Y UI
function nav(id, btn) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById('sec-' + id).classList.add('active-section');
    
    // Actualizar botones móviles y PC
    document.querySelectorAll('.tab-btn, .tab-btn-desktop').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if(id === 'pdf') updateChart();
    if(id === 'firma') setTimeout(resizeCanvas, 300); // Re-ajustar canvas al mostrar
    lucide.createIcons();
}

function toggleFacturaField() {
    const tipo = document.getElementById('c_tipo').value;
    const contFactura = document.getElementById('contenedor-num-factura');
    const labelTiempo = document.getElementById('label-tiempo');
    
    if (tipo === 'FACTURA' || tipo === 'ORDEN DE TRABAJO') {
        contFactura.classList.remove('hidden');
        labelTiempo.innerText = tipo === 'FACTURA' ? "Vencimiento (Días)" : "Tiempo Ejecución (Días)";
        labelTiempo.className = "text-xs font-black text-red-600 ml-2 uppercase";
    } else {
        contFactura.classList.add('hidden');
        labelTiempo.innerText = "Validez / Garantía (Días)";
        labelTiempo.className = "text-xs font-black text-olive ml-2 uppercase";
    }
}

function toggleAnticipo() {
    const isChecked = document.getElementById('chk_anticipo').checked;
    document.getElementById('panel_anticipo').classList.toggle('hidden', !isChecked);
    calcular();
}

// 4. GESTIÓN DE ITEMS (Estructura Ampliada)
function addItem(tipo) {
    const cont = tipo === 'MO' ? document.getElementById('cont-mo') : document.getElementById('cont-mat');
    const lista = tipo === 'MO' ? DB.MO : DB.MAT;
    const card = document.createElement('div');
    
    card.className = `glass-card p-5 relative border-l-8 mb-4 hover-dynamic transition-all ${tipo === 'MO' ? 'border-olive' : 'border-slate-800'}`;
    card.innerHTML = `
        <button onclick="this.parentElement.remove(); calcular()" class="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-10 transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"> 
            <div class="md:col-span-5">
                <label class="text-[10px] font-black text-slate-500 block ml-2 mb-1 uppercase">Descripción del Item</label>
                <select class="input-dynamic item-sel text-sm !p-2" onchange="checkOther(this)">
                    <option value="">-- Seleccionar --</option>
                    ${lista.map(i => `<option value="${i}">${i}</option>`).join('')}
                    <option value="OTRO">✏️ OTRO / PERSONALIZADO</option>
                </select>
                <textarea class="item-custom hidden input-dynamic h-16 mt-2 text-sm" placeholder="Detalle específico..."></textarea>
            </div>
            
            <div class="md:col-span-2">
                <label class="text-[10px] font-black text-slate-500 block ml-2 mb-1">UNIDAD</label>
                <input type="text" value="${tipo==='MO'?'GLB':'UND'}" class="input-dynamic item-u text-center text-sm font-bold !p-2 uppercase">
            </div>

            <div class="md:col-span-2">
                <label class="text-[10px] font-black text-slate-500 block ml-2 mb-1">CANT.</label>
                <input type="number" value="1" step="0.01" class="input-dynamic item-q text-center text-sm font-bold !p-2" oninput="calcular()">
            </div>
            
            <div class="md:col-span-3">
                <label class="text-[10px] font-black text-slate-500 block ml-2 mb-1">V. UNITARIO</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-olive">$</span>
                    <input type="number" class="input-dynamic item-p text-sm font-bold !pl-8 !p-2" oninput="calcular()" placeholder="0">
                </div>
            </div>
        </div>
    `;
    cont.appendChild(card);
    lucide.createIcons();
    calcular();
}

function checkOther(sel) { 
    sel.parentElement.querySelector('.item-custom').classList.toggle('hidden', sel.value !== 'OTRO');
}



// --- SISTEMA DE EVIDENCIA VISUAL ---

function handlePhotos(input) {
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => { 
                FOTOS_DB.push({ src: e.target.result, desc: "" }); 
                renderPhotos(); 
            };
            reader.readAsDataURL(file);
        });
    }
    // Limpiamos el input para que permita volver a subir la misma imagen si la borras
    input.value = '';
}

function renderPhotos() {
    const cont = document.getElementById('cont-fotos');
    cont.innerHTML = ''; // Limpiamos el contenedor
    
    FOTOS_DB.forEach((f, idx) => {
        const div = document.createElement('div');
        // Usamos el diseño PRO con bordes redondeados y efecto hover
        div.className = "bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm relative hover-dynamic transition-all";
        div.innerHTML = `
            <button onclick="FOTOS_DB.splice(${idx},1); renderPhotos()" class="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-10 transition-colors" title="Eliminar foto">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <img src="${f.src}" class="w-full h-48 object-cover rounded-2xl mb-4 border border-slate-100">
            <textarea placeholder="Descripción / Nota técnica..." class="input-dynamic w-full h-20 text-xs resize-none" 
                      oninput="FOTOS_DB[${idx}].desc = this.value">${f.desc}</textarea>
        `;
        cont.appendChild(div);
    });
    
    // Recargamos los iconos de papelera
    lucide.createIcons();
}


// 5. CÁLCULOS Y GRÁFICAS
function calcular() {
    let tMO = 0, tMAT = 0;
    
    document.querySelectorAll('#cont-mo > div').forEach(c => {
        const q = parseFloat(c.querySelector('.item-q').value) || 0;
        const p = parseFloat(c.querySelector('.item-p').value) || 0;
        tMO += (q * p);
    });
    
    document.querySelectorAll('#cont-mat > div').forEach(c => {
        const q = parseFloat(c.querySelector('.item-q').value) || 0;
        const p = parseFloat(c.querySelector('.item-p').value) || 0;
        tMAT += (q * p);
    });
    
    document.getElementById('sub_mo').innerText = `$ ${tMO.toLocaleString()}`;
    document.getElementById('sub_mat').innerText = `$ ${tMAT.toLocaleString()}`;
    
    const total = tMO + tMAT;
    document.getElementById('topTotal').innerText = `$ ${total.toLocaleString()}`;
    document.getElementById('finalTotal').innerText = `$ ${total.toLocaleString()}`;
    if(document.getElementById('sideTotal')) document.getElementById('sideTotal').innerText = `$ ${total.toLocaleString()}`;

    if(document.getElementById('chk_anticipo').checked) {
        const pct = parseFloat(document.getElementById('val_anticipo_pct').value) || 0;
        document.getElementById('monto_anticipo_final').innerText = `$ ${((total * pct) / 100).toLocaleString()}`;
    }
}

function updateChart() {
    const ctx = document.getElementById('statsChart').getContext('2d');
    const mo = parseFloat(document.getElementById('sub_mo').innerText.replace(/[^0-9]/g, '')) || 0;
    const mat = parseFloat(document.getElementById('sub_mat').innerText.replace(/[^0-9]/g, '')) || 0;

    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Servicios / M.O.', 'Insumos / Mat.'],
            datasets: [{
                data: [mo, mat], backgroundColor: ['#556B2F', '#1e293b'],
                borderWidth: 0, hoverOffset: 15
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', weight: 'bold' } } } },
            cutout: '75%'
        }
    });
    
    const total = mo + mat;
    const pMO = total > 0 ? ((mo / total) * 100).toFixed(0) : 0;
    document.getElementById('statsSummary').innerText = `Mano de Obra representa el ${pMO}% del proyecto`;
}


   // 6. GENERACIÓN DEL PDF PROFESIONAL MOLDEABLE
async function generarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const colorOlive = [85, 107, 47]; // #556B2F
    const colorSlate = [30, 41, 59];  // #1e293b
    const colorGrayLight = [248, 250, 252]; // Fondo suave
    

    // 1. Obtenemos todos los datos (asegúrate que obtenerDatosResumen ya esté actualizada)
const d = obtenerDatosResumen(); 

// 2. Definimos el tipo de documento (COTIZACIÓN, FACTURA, etc.)
const tipoDoc = document.getElementById('c_tipo').value.toUpperCase();

// 3. Lógica para la Referencia: 
// Si es FACTURA busca el id 'c_num_factura'. Si no, pone "S/N"
const refDoc = (tipoDoc === "FACTURA" || tipoDoc === "ORDEN DE TRABAJO") 
        ? (document.getElementById('c_num_factura')?.value || "") 
        : "";




    // 1. FONDO DE ENCABEZADO (Franja sutil)
    doc.setFillColor(...colorGrayLight);
    doc.rect(0, 0, 210, 42, 'F');

    // 2. LOGO / ICONO (Mantenemos tu posición y tamaño)
    if (LOGO_BASE64) {
        doc.addImage(LOGO_BASE64, 'PNG', 15, 8, 28, 28);
    }

    // 3. BLOQUE IZQUIERDO: DATOS DE LA EMPRESA
    doc.setTextColor(...colorSlate);
    doc.setFontSize(22); 
    doc.setFont(undefined, 'bold');
    doc.text("KIOSCOS JOSE ARTETA", 48, 18);

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colorOlive);
    doc.text("ARQUITECTURA NATURAL & CONSTRUCCIÓN TÉCNICA", 48, 23);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139); // Gris medio
    doc.text("Nit: 12.345.678-9", 48, 28);
    doc.text("WhatsApp: +57 300 601 4846 | josealcides2021@gmail.com", 48, 32);

    // 4. BLOQUE DERECHO: DATOS DEL DOCUMENTO (Recuadro elegante)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(145, 10, 50, 25, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colorOlive);
    doc.text(tipoDoc, 150, 17);

    doc.setFontSize(12);
    doc.setTextColor(...colorSlate);
    doc.text(`No. ${refDoc}`, 150, 24);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 150, 30);

    // 5. LÍNEA DIVISORIA DE MARCA
    doc.setDrawColor(...colorOlive);
    doc.setLineWidth(0.6);
    doc.line(15, 48, 195, 48);

    // 6. BLOQUE CLIENTE (Diseño "Preparado para")
    doc.setTextColor(...colorSlate);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENTE:", 15, 56);

    doc.setFontSize(12);
    doc.setTextColor(...colorSlate);
    doc.text(d.cliente.toUpperCase(), 15, 62);

    // Grid de datos del cliente
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    
    // Columna A
    doc.setFont(undefined, 'bold'); doc.text("Identificación:", 15, 68);
    doc.setFont(undefined, 'normal'); doc.text(document.getElementById('c_nit').value || "N/A", 40, 68);
    
    doc.setFont(undefined, 'bold'); doc.text("Proyecto / Obra:", 15, 73);
    doc.setFont(undefined, 'normal'); doc.text(d.obra, 40, 73);

    // Columna B
    doc.setFont(undefined, 'bold'); doc.text("Teléfono:", 110, 68);
    doc.setFont(undefined, 'normal'); doc.text(iti.getNumber(), 125, 68);

    doc.setFont(undefined, 'bold'); doc.text("Email:", 110, 73);
    doc.setFont(undefined, 'normal'); doc.text(d.email || "N/A", 125, 73);

    let currentY = 88; // Continuas con el resto de tu lógica de tablas...

    // Extractor de Datos para Tablas
    const extractTableData = (id) => {
        let data = [];
        document.querySelectorAll(`#${id} > div`).forEach(c => {
            let desc = c.querySelector('.item-sel').value;
            if(desc === 'OTRO') desc = c.querySelector('.item-custom').value;
            const u = c.querySelector('.item-u').value.toUpperCase();
            const q = parseFloat(c.querySelector('.item-q').value) || 0;
            const p = parseFloat(c.querySelector('.item-p').value) || 0;
            if(desc) data.push([desc.toUpperCase(), u, q, `$ ${p.toLocaleString()}`, `$ ${(q*p).toLocaleString()}`]);
        });
        return data;
    };





// --- TABLA MANO DE OBRA (ESTILO COMPACTO) ---
    const moData = extractTableData('cont-mo');
    if(moData.length > 0) {
        const totalMO = moData.reduce((acc, row) => acc + (parseFloat(row[4].replace(/[^0-9]/g, "")) || 0), 0);
        
        // Fila de Subtotal con estilo integrado
        moData.push([{ 
            content: 'SUBTOTAL SERVICIOS:', 
            colSpan: 4, 
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } 
        }, { 
            content: `$ ${totalMO.toLocaleString()}`, 
            styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: colorOlive } 
        }]);

        doc.autoTable({
            startY: currentY,
            head: [['Descripción del Servicio', 'Und', 'Cant', 'V. Unitario', 'Subtotal']],
            body: moData,
            theme: 'striped', // Estilo más moderno y limpio
            headStyles: { 
                fillColor: colorOlive, 
                fontSize: 8, 
                fontStyle: 'bold', 
                halign: 'center',
                cellPadding: 2 
            },
            styles: { 
                fontSize: 7.5, 
                cellPadding: 2, // Reducido para que sea más compacto
                font: 'helvetica',
                lineColor: [241, 245, 249],
                lineWidth: 0.1
            },
            columnStyles: { 
                0: { cellWidth: 'auto' },
                1: { halign: 'center' }, 
                2: { halign: 'center' }, 
                3: { halign: 'right' }, 
                4: { halign: 'right', fontStyle: 'bold' } 
            }
        });
        currentY = doc.lastAutoTable.finalY + 8;
    }

    // --- TABLA MATERIALES (ESTILO COMPACTO) ---
    const matData = extractTableData('cont-mat');
    if(matData.length > 0) {
        const totalMat = matData.reduce((acc, row) => acc + (parseFloat(row[4].replace(/[^0-9]/g, "")) || 0), 0);
        
        // Fila de Subtotal con estilo integrado
        matData.push([{ 
            content: 'SUBTOTAL INSUMOS:', 
            colSpan: 4, 
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } 
        }, { 
            content: `$ ${totalMat.toLocaleString()}`, 
            styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: colorSlate } 
        }]);

        doc.autoTable({
            startY: currentY,
            head: [['Descripción de Material/Insumo', 'Und', 'Cant', 'V. Unitario', 'Subtotal']],
            body: matData,
            theme: 'striped',
            headStyles: { 
                fillColor: colorSlate, 
                fontSize: 8, 
                fontStyle: 'bold', 
                halign: 'center',
                cellPadding: 2 
            },
            styles: { 
                fontSize: 7.5, 
                cellPadding: 2, // Reducido para evitar el salto de página
                font: 'helvetica',
                lineColor: [241, 245, 249],
                lineWidth: 0.1
            },
            columnStyles: { 
                0: { cellWidth: 'auto' },
                1: { halign: 'center' }, 
                2: { halign: 'center' }, 
                3: { halign: 'right' }, 
                4: { halign: 'right', fontStyle: 'bold' } 
            }
        });
        currentY = doc.lastAutoTable.finalY + 8;
    }


    // Bloque Totales
 // --- CIERRE DEL DOCUMENTO (COMPACTO Y PROFESIONAL) ---
    
    // Verificación inteligente de espacio
    if (currentY > 220) { doc.addPage(); currentY = 20; }

    // 1. RECUADRO DE TOTALES Y CONDICIONES (Fondo suave)
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Borde suave
    doc.roundedRect(15, currentY, 180, 22, 3, 3, 'FD');

    // Columna Izquierda: Condiciones (Dentro del recuadro)
    doc.setFontSize(7.5); doc.setTextColor(100); doc.setFont(undefined, 'bold');
    doc.text("NOTAS Y CONDICIONES:", 20, currentY + 7);
    
    doc.setFont(undefined, 'normal');
    doc.text(`• ${document.getElementById('label-tiempo').innerText}: ${document.getElementById('c_garantia').value} Días.`, 20, currentY + 13);
    if(document.getElementById('chk_anticipo').checked) {
        doc.text(`• Inicio: Anticipo de ${document.getElementById('monto_anticipo_final').innerText}`, 20, currentY + 17);
    }

    // Columna Derecha: Total General (Diseño destacado)
    doc.setFillColor(...colorOlive);
    doc.roundedRect(135, currentY + 3, 55, 16, 2, 2, 'F');
    
    doc.setTextColor(255);
    doc.setFontSize(8); doc.setFont(undefined, 'bold');
    doc.text("TOTAL GENERAL:", 139, currentY + 9);
    
    doc.setFontSize(11); // Tamaño optimizado
    doc.text(document.getElementById('finalTotal').innerText, 186, currentY + 15, {align: 'right'});

    currentY += 35; // Espacio para las firmas
// 2. SECCIÓN DE FIRMAS (ALINEACIÓN PRECISA DOBLE)
    doc.setDrawColor(200); doc.setLineWidth(0.2);
    
    // Asegurarnos de guardar el último trazo antes de generar el PDF
    guardarFirmaActual();

    // Firma Emisor (Izquierda)
    if(firmaEmpresa && firmaEmpresa.length > 100) {
        doc.addImage(firmaEmpresa, 'PNG', 15, currentY - 15, 50, 20);
    }
    doc.line(15, currentY, 80, currentY);
    doc.setFontSize(8); doc.setTextColor(...colorSlate); doc.setFont(undefined, 'bold');
    doc.text("JOSÉ ARTETA", 15, currentY + 5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(100);
    doc.text("Dirección de Proyectos", 15, currentY + 9);
    doc.text("Kioscos Jose Arteta", 15, currentY + 13);

    // Firma Cliente (Derecha)
    if(firmaCliente && firmaCliente.length > 100) {
        doc.addImage(firmaCliente, 'PNG', 120, currentY - 15, 50, 20);
    }
    doc.line(120, currentY, 185, currentY);
    
    doc.setFontSize(8); doc.setTextColor(...colorSlate); doc.setFont(undefined, 'bold');
    const nombreCliente = document.getElementById('c_nombre').value.toUpperCase() || "ACEPTACIÓN CLIENTE";
    doc.text(nombreCliente, 120, currentY + 5);
    
    doc.setFont(undefined, 'normal'); doc.setTextColor(100);
    const nitCliente = document.getElementById('c_nit').value || "_________________";
    doc.text(`NIT/CC: ${nitCliente}`, 120, currentY + 9);
    doc.text("Aceptado de conformidad", 120, currentY + 13);

    currentY += 20;



    // --- ANEXO DE FOTOS EN EL PDF ---
    if(FOTOS_DB.length > 0) {
        doc.addPage();
        
        // Franja de encabezado para el anexo
        doc.setFillColor(...colorOlive);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255);
        doc.setFontSize(14); doc.setFont(undefined, 'bold');
        doc.text("ANEXO: EVIDENCIA FOTOGRÁFICA", 20, 13);
        
        let photoY = 30;
        
        FOTOS_DB.forEach((f, i) => {
            // Salto de página si ya no caben más fotos
            if (photoY > 230) { doc.addPage(); photoY = 20; }
            
            // Recuadro de la foto
            doc.setDrawColor(220);
            doc.setLineWidth(0.3);
            doc.rect(19, photoY - 1, 172, 62); 
            
            try {
                // Insertamos la imagen (x, y, ancho, alto)
                doc.addImage(f.src, 'JPEG', 21, photoY, 80, 60);
                
                // Textos a la derecha de la imagen
                doc.setTextColor(...colorSlate);
                doc.setFontSize(10); doc.setFont(undefined, 'bold');
                doc.text(`Registro #${i+1}:`, 105, photoY + 5);
                
                doc.setFontSize(9); doc.setFont(undefined, 'normal');
                doc.setTextColor(100);
                
                // Dividimos el texto para que no se salga de la página (ancho max: 80)
                const lines = doc.splitTextToSize(f.desc || "Evidencia técnica visual adjunta sin descripción específica.", 80);
                doc.text(lines, 105, photoY + 12);
                
            } catch(e) {
                console.error("Error al incrustar la imagen en el PDF:", e);
            }
            
            photoY += 70; // Espaciado para la siguiente foto
        });
    }






    doc.save(`${tipoDoc}_${document.getElementById('c_nombre').value.replace(/\s+/g, '_')}.pdf`);
}

// Función auxiliar para verificar si el canvas está en blanco
function isSignatureEmpty(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width; blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

// 7. COMUNICACIONES Y ARRANQUE
function obtenerDatosResumen() {
    const tipoSeleccionado = document.getElementById('c_tipo').value;

  let folioFinal = "";
    const tipo = document.getElementById('c_tipo').value;

    if (tipo === "FACTURA" || tipo === "ORDEN DE TRABAJO") {
        const inputFactura = document.getElementById('c_num_factura');
        folioFinal = inputFactura.value.trim() !== "" ? inputFactura.value : "S/N";
    }

    return {
        cliente: document.getElementById('c_nombre').value || "Cliente",
        telefono: iti.getNumber().replace('+', ''),
        email: document.getElementById('c_email').value,
        tipo: tipoSeleccionado,
        obra: document.getElementById('c_obra').value || "Sede principal",
        referencia: folioFinal, // Este valor irá al PDF
        garantia: document.getElementById('c_garantia').value || "15",
        total: document.getElementById('finalTotal').innerText
    };
}



function enviarWhatsApp() {
    const d = obtenerDatosResumen();
    if(!d.telefono) return alert("Por favor, ingrese el número de teléfono del cliente.");
    
    const fecha = new Date().toLocaleDateString();
    const tipoDoc = document.getElementById('c_tipo').value;
    const obra = document.getElementById('c_obra').value || "Ubicación por definir";

    const texto = 
        `*SOLICITUD DE GESTIÓN - KIOSCOS JOSE ARTETA*\n` +
        `-----------------------------------------------\n` +
        `Estimado(a) *${d.cliente}*,\n\n` +
        `Es un gusto saludarle. Adjunto los detalles principales de la *${tipoDoc}* generada el día de hoy (${fecha}) para el proyecto en: *${obra}*.\n\n` +
        `*RESUMEN FINANCIERO:*\n` +
        `• *Estado:* Propuesta Formal\n` +
        `• *Inversión Total:* ${d.total}\n` +
        `• *Validez:* ${document.getElementById('c_garantia').value} días.\n\n` +
        `He generado el documento PDF detallado con el desglose de materiales, mano de obra y registro fotográfico. ¿Le gustaría que se lo envíe por este medio o prefiere que lo revisemos en una llamada?\n\n` +
        `Atentamente,\n` +
        `*Jose Arteta*\n` +
        `_Arquitectura Natural & Construcción Técnica_`;

    window.open(`https://wa.me/${d.telefono}?text=${encodeURIComponent(texto)}`, '_blank');
}


function enviarEmail() {
    const d = obtenerDatosResumen();
    if(!d.email) return alert("Por favor, ingrese el correo electrónico del cliente.");

    const tipoDoc = document.getElementById('c_tipo').value;
    const fecha = new Date().toLocaleDateString();
    const obra = document.getElementById('c_obra').value || "su propiedad/obra";
    const garantia = document.getElementById('c_garantia').value;
    const numDoc = document.getElementById('c_num_factura').value || "N/A";

    const asunto = `${tipoDoc} Profesional - Proyecto: ${d.cliente} - KIOSCOS JOSE ARTETA`;
    
    const cuerpo = 
        `Estimado(a) ${d.cliente},\n\n` +
        `Reciba un cordial saludo de parte del equipo de KIOSCOS JOSE ARTETA.\n\n` +
        `Dando seguimiento a nuestro compromiso de brindarle soluciones de alta calidad en Arquitectura Natural y Construcción Técnica, nos permitimos adjuntar la información detallada correspondiente a la ${tipoDoc} solicitada para el proyecto ubicado en ${obra}.\n\n` +
        `DETALLES DEL DOCUMENTO:\n` +
        `------------------------------------------------------------\n` +
        `Fecha de Emisión: ${fecha}\n` +
        `Inversión Total Estimada: ${d.total}\n` +
        `Periodo de Validez/Garantía: ${garantia} días calendario.\n` +
        `------------------------------------------------------------\n\n` +
        `Nuestro equipo ha realizado un análisis exhaustivo para asegurar que los materiales y la mano de obra propuestos cumplan con los más altos estándares de durabilidad y estética natural que nos caracterizan.\n\n` +
        `TÉRMINOS GENERALES:\n` +
        `1. Los precios están sujetos a la validez indicada anteriormente.\n` +
        `2. El inicio de actividades está sujeto a la aprobación de la presente y el cumplimiento del anticipo acordado (si aplica).\n` +
        `3. Se adjunta registro fotográfico del estado actual/inspección técnica en el documento PDF.\n\n` +
        `Por favor, revise el archivo PDF adjunto (enviado en mensaje por separado o disponible para su descarga) para conocer el desglose ítem por ítem. Quedamos a su entera disposición para agendar una reunión técnica o resolver cualquier inquietud adicional.\n\n` +
        `Agradecemos la confianza depositada en nuestro trabajo.\n\n` +
        `Atentamente,\n\n` +
        `JOSÉ ARTETA\n` +
        `Director de Proyectos\n` +
        `PRO ARTETA | Arquitectura Natural & Construcción Técnica\n` +
        `WhatsApp: +57 300 601 4846\n` +
        `Email: josealcides2021@gmail.com`;

    window.location.href = `mailto:${d.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}



lucide.createIcons();
toggleFacturaField();
calcular();



// 1. BASE DE DATOS DE USUARIOS (Ajusta según necesites)
const USUARIOS_AUTORIZADOS = [
    { user: "jose.arteta", pass: "arteta2026", nombre: "José Arteta" },
    { user: "miguel", pass: "2356", nombre: "Miguel Coronell" }
];

// 2. LÓGICA PRINCIPAL DE LOGIN
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userIn = document.getElementById('user-input').value.trim();
    const passIn = document.getElementById('pass-input').value.trim();
    const errorBox = document.getElementById('login-error');
    const loginCard = document.querySelector('#login-container > div');
    const btnSubmit = e.target.querySelector('button[type="submit"]');

    // Buscamos coincidencia
    const acceso = USUARIOS_AUTORIZADOS.find(u => u.user === userIn && u.pass === passIn);

    if (acceso) {
        // --- EFECTO DE ÉXITO ---
        errorBox.classList.add('hidden');
        
        // Cambiamos el botón para feedback visual
        btnSubmit.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 animate-bounce"></i> ACCEDIENDO...`;
        lucide.createIcons();
        btnSubmit.style.backgroundColor = "#22c55e"; // Verde éxito

        // Guardar sesión
        sessionStorage.setItem('sesion_activa', acceso.nombre);
        
        // Animación de salida de la tarjeta
        loginCard.classList.add('translate-y-10', 'opacity-0', 'transition-all', 'duration-500');
        
        setTimeout(() => {
            document.getElementById('login-container').classList.add('opacity-0', 'pointer-events-none');
            
            // Mostrar menú y app
            const navMovil = document.getElementById('mobile-nav');
            if (navMovil) {
                navMovil.classList.remove('hidden');
                navMovil.classList.add('flex');
            }
            
            setTimeout(() => {
                document.getElementById('login-container').style.display = 'none';
                alert(`Bienvenido al sistema, ${acceso.nombre}`);
            }, 500);
        }, 600);

    } else {
        // --- EFECTO DE ERROR ---
        errorBox.classList.remove('hidden');
        
        // Animación de sacudida (Shake) a la tarjeta
        loginCard.classList.add('animate-shake');
        setTimeout(() => loginCard.classList.remove('animate-shake'), 500);

        // Limpiar campo contraseña y resaltar error
        document.getElementById('pass-input').value = "";
        document.getElementById('pass-input').focus();
        
        // Re-inicializar iconos de Lucide dentro del error
        lucide.createIcons();
    }
});

// 3. ESTILO DE ANIMACIÓN SHAKE (Añadir a tu CSS o inyectar)
const style = document.createElement('style');
style.innerHTML = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        50% { transform: translateX(8px); }
        75% { transform: translateX(-8px); }
    }
    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
`;
document.head.appendChild(style);








// ==========================================
// ACCIONES DE SESIÓN Y LIMPIEZA
// ==========================================

// 1. Función para Salir del Sistema
function cerrarSesion() {
    if(confirm("¿Estás seguro de que deseas cerrar sesión?")) {
        sessionStorage.removeItem('sesion_activa');
        window.location.reload(); // Recarga la página para mostrar el Login
    }
}

// 2. Función para Limpiar Todo y empezar de cero
function nuevoDocumento() {
    if(!confirm("¿Deseas limpiar todos los datos? Se borrará el presupuesto actual.")) return;

    // A. Limpiar campos de texto e inputs
    const camposTexto = ['c_nombre', 'c_tel', 'c_email', 'c_obra', 'c_num_factura', 'c_nit'];
    camposTexto.forEach(id => {
        const elemento = document.getElementById(id);
        if(elemento) elemento.value = '';
    });

    // B. Restaurar selects y valores por defecto
    const selectTipo = document.getElementById('c_tipo');
    if(selectTipo) {
        selectTipo.value = 'COTIZACIÓN';
        toggleFacturaField(); // Oculta el campo rojo de factura
    }
    
    const inputGarantia = document.getElementById('c_garantia');
    if(inputGarantia) inputGarantia.value = '15';

    // C. Vaciar las tablas de Materiales y Mano de Obra
    const contMo = document.getElementById('cont-mo');
    if(contMo) contMo.innerHTML = '';
    
    const contMat = document.getElementById('cont-mat');
    if(contMat) contMat.innerHTML = '';

    // D. Vaciar Fotos
    FOTOS_DB = [];
    if(typeof renderPhotos === 'function') renderPhotos();

    // E. Limpiar Pad de Firmas
    limpiarCanvas();
    const switchFirma = document.getElementById('switch-firma');
    if(switchFirma && switchFirma.checked) {
        switchFirma.checked = false; // Devuelve el switch a "EMPRESA"
        cambiarFirmante();
    }

    // F. Recalcular los totales para que queden en $0
    calcular();

    // G. Volver a la primera pestaña (Datos del Cliente)
    nav('cliente');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Recargar iconos por si acaso
    if(typeof lucide !== 'undefined') lucide.createIcons();
}
















// 4. PERSISTENCIA AL RECARGAR
window.addEventListener('load', () => {
    const sesion = sessionStorage.getItem('sesion_activa');
    const loginPage = document.getElementById('login-container');
    const navMovil = document.getElementById('mobile-nav');

    if (sesion) {
        loginPage.style.display = 'none';
        if (navMovil) {
            navMovil.classList.remove('hidden');
            navMovil.classList.add('flex');
        }
    } else {
        loginPage.style.display = 'flex';
        if (navMovil) {
            navMovil.classList.add('hidden');
            navMovil.classList.remove('flex');
        }
    }
    lucide.createIcons();
});
