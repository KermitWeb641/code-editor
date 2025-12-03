import { CodeJar } from 'codejar';
import Prism from 'prismjs';

// --- State ---
let files = [
    { id: 'f1', name: 'index.html', content: '<!-- HTML goes here -->', instance: null },
    { id: 'f2', name: 'style.css', content: '/* CSS goes here */', instance: null },
    { id: 'f3', name: 'script.js', content: '// JS goes here', instance: null }
];
let activeFileId = 'f1';
let isPreviewActive = false;

// --- Elements ---
const elements = {
    tabsNav: document.getElementById('tabs-nav'),
    mainArea: document.getElementById('main-area'),
    addBtn: document.getElementById('add-file-btn'),
    previewTab: document.getElementById('preview-tab'),
    previewPane: document.getElementById('preview'),
    previewFrame: document.getElementById('result-frame'),
    status: document.getElementById('status-msg'),
    runBtn: document.getElementById('run-btn'),
    importBtn: document.getElementById('import-btn'),
    exportBtn: document.getElementById('export-btn'),
    openWindowBtn: document.getElementById('open-window-btn'),
    renameBtn: document.getElementById('rename-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    fileInput: document.getElementById('file-input'),
    imageInput: document.getElementById('image-input'),
    modal: document.getElementById('file-type-modal'),
    closeModalBtn: document.getElementById('close-modal-btn')
};

// --- Helpers ---
const generateId = () => 'file-' + Math.random().toString(36).substr(2, 9);

const isImage = (name) => /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(name);

const getLangFromFilename = (name) => {
    if (isImage(name)) return 'image';
    if (name.endsWith('.html')) return 'html';
    if (name.endsWith('.css')) return 'css';
    if (name.endsWith('.js')) return 'javascript';
    return 'plaintext';
};

const highlight = (editor) => Prism.highlightElement(editor);

// --- Core Logic ---

function init() {
    renderTabs();
    files.forEach(createEditorForFile);
    switchTab(files[0].id);
    updatePreview();
}

// Create DOM and CodeJar instance for a file
function createEditorForFile(file) {
    // Create container
    const pane = document.createElement('div');
    pane.className = 'editor-pane hidden';
    pane.id = `pane-${file.id}`;
    
    const lang = getLangFromFilename(file.name);
    const wrapper = document.createElement('div');
    wrapper.className = `editor-wrapper language-${lang}`;
    
    if (lang === 'image') {
        wrapper.classList.add('image-preview');
        const img = document.createElement('img');
        img.src = file.content;
        wrapper.appendChild(img);
        
        // Mock instance for images so imports don't crash (though imports usually target text files)
        file.instance = {
            updateCode: (code) => { file.content = code; img.src = code; },
            onUpdate: () => {}
        };
    } else {
        wrapper.textContent = file.content;
        // Init CodeJar for text files
        file.instance = CodeJar(wrapper, highlight);
        file.instance.onUpdate(code => {
            file.content = code;
            elements.status.textContent = "Unsaved changes...";
        });
        highlight(wrapper);
    }
    
    pane.appendChild(wrapper);
    elements.mainArea.appendChild(pane);
}

function renderTabs() {
    // Remove existing file tabs (keep add btn and preview)
    const existingTabs = elements.tabsNav.querySelectorAll('.file-tab');
    existingTabs.forEach(t => t.remove());

    // Insert new tabs before the Add button
    files.forEach(file => {
        const btn = document.createElement('button');
        btn.className = `tab-btn file-tab ${file.id === activeFileId && !isPreviewActive ? 'active' : ''}`;
        btn.textContent = file.name;
        btn.dataset.id = file.id;
        btn.onclick = () => switchTab(file.id);
        elements.tabsNav.insertBefore(btn, elements.addBtn);
    });
}

function switchTab(id) {
    if (id === 'preview') {
        isPreviewActive = true;
        // UI Updates
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        elements.previewTab.classList.add('active');
        
        document.querySelectorAll('.editor-pane').forEach(p => {
            p.classList.remove('active');
            p.classList.add('hidden');
        });
        elements.previewPane.classList.remove('hidden');
        elements.previewPane.classList.add('active');
        return;
    }

    // Switch to file
    const file = files.find(f => f.id === id);
    if (!file) return;

    activeFileId = id;
    isPreviewActive = false;

    // UI Updates
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector(`.tab-btn[data-id="${id}"]`);
    if (tab) tab.classList.add('active');
    
    // Panes
    document.querySelectorAll('.editor-pane').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });
    
    const activePane = document.getElementById(`pane-${id}`);
    if (activePane) {
        activePane.classList.remove('hidden');
        activePane.classList.add('active');
    }
}

// Add New File
elements.addBtn.addEventListener('click', () => {
    elements.modal.classList.remove('hidden');
});

elements.closeModalBtn.addEventListener('click', () => {
    elements.modal.classList.add('hidden');
});

document.querySelectorAll('.modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        elements.modal.classList.add('hidden');
        
        if (type === 'image') {
            elements.imageInput.click();
            return;
        }

        let ext = '.js';
        let placeholder = 'new.js';
        let content = '// JS code';
        
        if (type === 'html') { ext = '.html'; placeholder = 'page.html'; content = '<!-- HTML code -->'; }
        else if (type === 'css') { ext = '.css'; placeholder = 'style.css'; content = '/* CSS code */'; }
        
        const name = prompt(`Enter ${type.toUpperCase()} file name:`, placeholder);
        if (!name) return;

        let finalName = name.trim();
        if (!finalName.toLowerCase().endsWith(ext)) finalName += ext;

        const newFile = {
            id: generateId(),
            name: finalName,
            content: content,
            instance: null
        };
        
        files.push(newFile);
        createEditorForFile(newFile);
        renderTabs();
        switchTab(newFile.id);
    });
});

// Handle Image Upload
elements.imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const result = evt.target.result;
        const name = prompt("Enter image file name:", file.name);
        if (!name) return;

        // Ensure it has an image extension if user removed it, though we trust user generally
        const newFile = {
            id: generateId(),
            name: name.trim(),
            content: result, // Base64 Data URL
            instance: null
        };
        
        files.push(newFile);
        createEditorForFile(newFile);
        renderTabs();
        switchTab(newFile.id);
        
        elements.imageInput.value = ''; // Reset
    };
    reader.readAsDataURL(file);
});

// Rename File
elements.renameBtn.addEventListener('click', () => {
    if (isPreviewActive) return;

    const file = files.find(f => f.id === activeFileId);
    if (!file) return;

    const newName = prompt("Rename file:", file.name);
    if (!newName || newName === file.name) return;

    file.name = newName.trim();
    
    // Update Prism Class
    const pane = document.getElementById(`pane-${file.id}`);
    const wrapper = pane.querySelector('.editor-wrapper');
    wrapper.className = `editor-wrapper language-${getLangFromFilename(file.name)}`;
    highlight(wrapper);

    renderTabs();
});

// Delete File
elements.deleteBtn.addEventListener('click', () => {
    if (isPreviewActive) return;

    if (files.length <= 1) {
        alert("Cannot delete the only remaining file.");
        return;
    }

    const file = files.find(f => f.id === activeFileId);
    if (!file) return;

    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

    // Remove pane from DOM
    const pane = document.getElementById(`pane-${file.id}`);
    if (pane) pane.remove();

    // Remove from state
    const idx = files.findIndex(f => f.id === activeFileId);
    files.splice(idx, 1);

    // Switch to valid file (current index or previous if last)
    let newIdx = idx;
    if (newIdx >= files.length) newIdx = files.length - 1;
    
    renderTabs();
    if (files.length > 0) switchTab(files[newIdx].id);
});

// Helper to replace image filenames with Base64 content
function replaceImages(content) {
    let newContent = content;
    files.forEach(f => {
        if (isImage(f.name)) {
            // Escape regex special characters in filename
            const escapedName = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Global replace of the filename with the data URL
            const re = new RegExp(escapedName, 'g');
            newContent = newContent.replace(re, f.content);
        }
    });
    return newContent;
}

// Compile and inject code
function updatePreview() {
    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    files.forEach(f => {
        if (f.name.endsWith('.html')) {
            // If multiple HTML files, we prioritize index.html, else append (simple concatenation for now)
            if (f.name === 'index.html' || !htmlContent) {
                htmlContent = f.content; 
            } else {
                htmlContent += '\n' + f.content;
            }
        }
        else if (f.name.endsWith('.css')) cssContent += f.content + '\n';
        else if (f.name.endsWith('.js')) jsContent += f.content + '\n';
    });

    // Replace image references
    htmlContent = replaceImages(htmlContent);
    cssContent = replaceImages(cssContent);
    jsContent = replaceImages(jsContent);

    const source = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>${cssContent}</style>
        </head>
        <body>
            ${htmlContent}
            <script>
                try {
                    ${jsContent}
                } catch (err) {
                    console.error(err);
                }
            </script>
        </body>
        </html>
    `;

    elements.previewFrame.srcdoc = source;
    elements.status.textContent = "Running...";
    setTimeout(() => elements.status.textContent = "Ready", 500);
}

// Download/Export
function downloadCode() {
    // Similar to updatePreview, we gather content
    let html = '';
    let css = '';
    let js = '';

    files.forEach(f => {
        if (f.name.endsWith('.html')) html += f.content + '\n';
        else if (f.name.endsWith('.css')) css += f.content + '\n';
        else if (f.name.endsWith('.js')) js += f.content + '\n';
    });

    // Replace images for export (creates a single file with embedded images)
    html = replaceImages(html);
    css = replaceImages(css);
    js = replaceImages(js);

    const fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exported Project</title>
<style>
${css}
</style>
</head>
<body>
${html}
<script>
${js}
</script>
</body>
</html>`;

    const blob = new Blob([fileContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    elements.status.textContent = "Downloaded!";
    setTimeout(() => elements.status.textContent = "Ready", 2000);
}

function openInNewWindow() {
    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    files.forEach(f => {
        if (f.name.endsWith('.html')) {
            if (f.name === 'index.html' || !htmlContent) {
                htmlContent = f.content; 
            } else {
                htmlContent += '\n' + f.content;
            }
        }
        else if (f.name.endsWith('.css')) cssContent += f.content + '\n';
        else if (f.name.endsWith('.js')) jsContent += f.content + '\n';
    });

    htmlContent = replaceImages(htmlContent);
    cssContent = replaceImages(cssContent);
    jsContent = replaceImages(jsContent);

    const source = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>${cssContent}</style>
        </head>
        <body>
            ${htmlContent}
            <script>
                try {
                    ${jsContent}
                } catch (err) {
                    console.error(err);
                }
            </script>
        </body>
        </html>
    `;

    const blob = new Blob([source], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

// Import - Simplified to just overwrite standard files for now
function importCode(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const style = doc.querySelector('style');
        const cssCode = style ? style.textContent.trim() : '';

        const scripts = doc.querySelectorAll('script');
        let jsCode = '';
        scripts.forEach(s => { if (!s.src) jsCode += s.textContent.trim() + '\n'; });

        doc.querySelectorAll('style, script').forEach(el => el.remove());
        const htmlCode = doc.body.innerHTML.trim();

        // Update basic files if they exist, or create them
        let fHtml = files.find(f => f.name === 'index.html');
        if (fHtml) fHtml.instance.updateCode(htmlCode);
        
        let fCss = files.find(f => f.name === 'style.css');
        if (fCss) fCss.instance.updateCode(cssCode);
        
        let fJs = files.find(f => f.name === 'script.js');
        if (fJs) fJs.instance.updateCode(jsCode);

        elements.fileInput.value = '';
        elements.status.textContent = "Imported!";
        setTimeout(() => elements.status.textContent = "Ready", 2000);
        updatePreview();
    };
    reader.readAsText(file);
}

// Event Listeners
elements.previewTab.addEventListener('click', () => switchTab('preview'));
elements.runBtn.addEventListener('click', () => {
    switchTab('preview');
    setTimeout(updatePreview, 50);
});
elements.exportBtn.addEventListener('click', downloadCode);
elements.openWindowBtn.addEventListener('click', openInNewWindow);
elements.importBtn.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', importCode);

// Start
init();