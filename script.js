// =========================================================================
// CONFIGURACIÓN DE ENDPOINTS GLOBALES
// =========================================================================
// Nueva URL fija para el procesamiento automatizado de justificantes:
const WEBHOOK_URL = 'https://flashbulb-encrypt-hyphen.ngrok-free.dev/webhook/recibir-justificantes';

// Elementos de Interfaz del DOM
const absenceForm = document.getElementById('absence-form');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const filePreview = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn = document.getElementById('remove-file-btn');
const submitBtn = document.getElementById('submit-btn');
const submitBtnText = document.getElementById('submit-btn-text');

// Variables de Control de Estado para Carga Extensible
let attachedFileBase64 = null;
let attachedFileName = "Ninguno";

// =========================================================================
// LÓGICA DE MANEJO DE ARCHIVOS (DROPZONE CONVERTER)
// =========================================================================

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelection);

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-cyan, #06b6d4)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelection();
    }
});

function handleFileSelection() {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
        showModal("ARCHIVO EXCEDIDO", "El documento seleccionado supera el límite de transferencia de 8 MB.");
        resetFileSelection();
        return;
    }

    attachedFileName = file.name;
    fileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onloadend = () => {
        attachedFileBase64 = reader.result.split(',')[1];
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
    };
    reader.onerror = () => {
        showModal("ERROR DE LECTURA", "No se pudo procesar el archivo seleccionado.");
        resetFileSelection();
    };
    reader.readAsDataURL(file);
}

removeFileBtn.addEventListener('click', resetFileSelection);

function resetFileSelection() {
    fileInput.value = "";
    attachedFileBase64 = null;
    attachedFileName = "Ninguno";
    filePreview.classList.add('hidden');
    dropZone.classList.remove('hidden');
}

// =========================================================================
// TRANSMISIÓN ASÍNCRONA HACIA EL NÚCLEO N8N
// =========================================================================

absenceForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    submitBtn.disabled = true;
    submitBtnText.textContent = "Despachando...";

    const payload = {
        // 1. Identificación Estudiantil
        nombre_estudiante: document.getElementById('studentName').value,
        carnet: document.getElementById('studentId').value,
        correo: document.getElementById('studentEmail').value,

        // 2. Especificación de la Incidencia
        motivo: document.getElementById('reason').value,
        fecha_inicio: document.getElementById('startDate').value,
        fecha_fin: document.getElementById('endDate').value,
        descripcion: document.getElementById('description').value,

        // 3. Evidencia Documental Sanitizada
        evidencia_nombre: attachedFileName,
        evidencia_base64: attachedFileBase64, 

        // 4. Parámetros Automatizados de Control Interno (Revisión Manual)
        estado_tramite: "Pendiente", 
        fecha_registro: new Date().toISOString()
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showModal("TRANSMISIÓN ÉXITOSA", "Los datos de la incidencia han sido sincronizados con el núcleo de automatización de Aether IA.");
            absenceForm.reset();
            resetFileSelection();
        } else {
            showModal("FALLO DE ENLACE", `El bus local respondió con un estado de error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error crítico de red en fetch:", error);
        showModal("ERROR DE RED", "No se pudo establecer conexión segura con el nodo Webhook de n8n. Verifique que el túnel ngrok y n8n estén activos y escuchando.");
    } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = "Despachar Formulario";
    }
});

function showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('modal-close-btn').onclick = () => {
        modal.classList.add('hidden');
    };
}
