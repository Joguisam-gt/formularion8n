// URL proporcionada de ngrok conectada a n8n
const WEBHOOK_URL = 'https://flashbulb-encrypt-hyphen.ngrok-free.dev/webhook-test/3dbd521c-548a-42c6-ae8f-68ca1118243c';

// Elementos del DOM
const absenceForm = document.getElementById('absence-form');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const filePreview = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn = document.getElementById('remove-file-btn');

// Variables de Control para el Archivo
let attachedFileBase64 = null;
let attachedFileName = "Ninguno";

// --- LOGICA DE MANEJO DE ARCHIVOS (DROPZONE) ---

// Abrir selector al hacer click en la zona de arrastre
dropZone.addEventListener('click', () => fileInput.click());

// Evento cuando se selecciona un archivo
fileInput.addEventListener('change', handleFileSelection);

// Arrastrar archivos dentro de la zona
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

// Procesar el archivo seleccionado y pasarlo a Base64
function handleFileSelection() {
    const file = fileInput.files[0];
    if (!file) return;

    // Validar límite de tamaño (8 MB)
    if (file.size > 8 * 1024 * 1024) {
        alert("El archivo excede el límite de transferencia de 8 MB.");
        resetFileSelection();
        return;
    }

    attachedFileName = file.name;
    fileNameDisplay.textContent = file.name;

    // Convertir el archivo a Base64 para envío seguro por JSON
    const reader = new FileReader();
    reader.onloadend = () => {
        attachedFileBase64 = reader.result.split(',')[1]; // Extrae solo la cadena binaria cifrada
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Remover archivo adjunto
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
    event.preventDefault(); // Detener recarga nativa de la página

    // Estructuración limpia del JSON compatible con el Bus de n8n
    const payload = {
        // 1. Identificación Estudiantil
        nombre_estudiante: document.getElementById('studentName').value,
        carnet: document.getElementById('studentId').value,
        correo: document.getElementById('studentEmail').value,
        materia_asignada: document.getElementById('subjectClass').value,

        // 2. Especificación de la Incidencia
        motivo: document.getElementById('reason').value,
        fecha_inicio: document.getElementById('startDate').value,
        fecha_fin: document.getElementById('endDate').value,
        descripcion: document.getElementById('description').value,

        // 3. Evidencia Documental (Procesada)
        evidencia_nombre: attachedFileName,
        evidencia_base64: attachedFileBase64, // Viaja como String codificado

        // 4. Parámetros Manuales de Control Interno / Auditoría
        estado_tramite: "Pendiente", // Inicia en espera de la Revisión Manual
        fecha_registro: new Date().toISOString()
    };

    try {
        // Enviar la petición HTTPS POST al tunnel ngrok -> n8n
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
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
            showModal("FALLO DE ENLACE", `El bus local respondió con error: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error de conexión con n8n:", error);
        showModal("ERROR DE RED", "No se pudo establecer conexión segura con el nodo Webhook de n8n. Verifique que el túnel ngrok esté activo.");
    }
});

// Control de ventanas emergentes integradas del HTML
function showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('modal-close-btn').onclick = () => {
        modal.classList.add('hidden');
    };
}