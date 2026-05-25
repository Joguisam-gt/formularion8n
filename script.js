// URL proporcionada de ngrok conectada al nodo Webhook de n8n
const WEBHOOK_URL = 'https://flashbulb-encrypt-hyphen.ngrok-free.dev/webhook-test/recibir-justificantes';

// Elementos del DOM
const absenceForm = document.getElementById('absence-form');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const filePreview = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn = document.getElementById('remove-file-btn');
const submitBtn = document.getElementById('submit-btn');
const submitBtnText = document.getElementById('submit-btn-text');

// Variables de Control para el Archivo
let attachedFileBase64 = null;
let attachedFileName = "Ninguno";

// --- CAPTURA DEL QUERY STRING (ID DE TRÁMITE) ---
// Leemos la URL actual del navegador
const urlParams = new URLSearchParams(window.location.search);
// Extraemos el valor del parámetro 'id_tramite' o asignamos un plan B por seguridad
const idTramite = urlParams.get('idtramite') || "Sin-ID";

// --- LÓGICA DE MANEJO DE ARCHIVOS (DROPZONE) ---

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelection);

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-color, #00ffcc)';
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
        alert("El archivo excede el límite de transferencia de 8 MB.");
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

// --- ENVÍO DE DATOS A N8N WEBHOOK ---

absenceForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Feedback visual en el botón para evitar doble envío síncrono
    submitBtn.disabled = true;
    submitBtnText.textContent = "Despachando...";

    // Estructuración limpia de los datos recopilados
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

        // 3. Evidencia Documental (Base64)
        evidencia_nombre: attachedFileName,
        evidencia_base64: attachedFileBase64, 

        // 4. Parámetros de Auditoría Interna
        estado_tramite: "Pendiente", 
        fecha_registro: new Date().toISOString(),
        id_tramite: idTramite 
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
        console.error("Error de conexión con n8n:", error);
        showModal("ERROR DE RED", "No se pudo establecer conexión segura con el nodo Webhook de n8n. Verifique que el túnel ngrok y n8n estén activos y escuchando.");
    } finally {
        // Restaurar botón a su estado original
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
