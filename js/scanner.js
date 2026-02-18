class CubeScanner {
    constructor() {
        this.video = document.getElementById('camera');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');
        this.gridCells = document.querySelectorAll('.grid-cell');
        this.previewCanvas = document.getElementById('previewCanvas');
        
        this.currentFace = 0;
        this.faces = ['U', 'R', 'F', 'D', 'L', 'B'];
        this.faceNames = ['BRANCO', 'VERMELHO', 'VERDE', 'AMARELO', 'LARANJA', 'AZUL'];
        this.faceColors = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];
        this.centers = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];
        
        this.cubeState = {
            U: Array(9).fill(null),
            R: Array(9).fill(null),
            F: Array(9).fill(null),
            D: Array(9).fill(null),
            L: Array(9).fill(null),
            B: Array(9).fill(null)
        };
        
        this.selectedColor = null;
        this.manualMode = false;
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewCube = null;
        
        this.init();
    }
    
    async init() {
        await this.setupCamera();
        this.setupEventListeners();
        this.initPreview3D();
        this.startDetectionLoop();
    }
    
    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
            });
        } catch (err) {
            console.error('Erro ao acessar câmera:', err);
            alert('Não foi possível acessar a câmera. Verifique as permissões.');
        }
    }
    
    setupEventListeners() {
        // Botões
        document.getElementById('btnCapture').addEventListener('click', () => this.captureFace());
        document.getElementById('btnManual').addEventListener('click', () => this.toggleManualMode());
        document.getElementById('btnConfirm').addEventListener('click', () => this.confirmCube());
        
        // Paleta de cores
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedColor = e.target.dataset.color;
            });
        });
        
        // Grid cells para modo manual
        this.gridCells.forEach((cell, index) => {
            cell.addEventListener('click', () => {
                if (this.manualMode && this.selectedColor) {
                    this.setCellColor(index, this.selectedColor);
                }
            });
        });
    }
    
    initPreview3D() {
        const width = this.previewCanvas.clientWidth;
        const height = this.previewCanvas.clientHeight;
        
        this.previewScene = new THREE.Scene();
        this.previewScene.background = new THREE.Color(0x000000);
        
        this.previewCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        this.previewCamera.position.set(3, 3, 3);
        this.previewCamera.lookAt(0, 0, 0);
        
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewCanvas, 
            antialias: true,
            alpha: true 
        });
        this.previewRenderer.setSize(width, height);
        
        // Criar cubo preview
        this.createPreviewCube();
        
        // Animação
        this.animatePreview();
    }
    
    createPreviewCube() {
        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
        const materials = [];
        
        // Materiais para cada face (serão atualizados)
        const colors = [0x333333, 0x333333, 0x333333, 0x333333, 0x333333, 0x333333];
        colors.forEach(color => {
            materials.push(new THREE.MeshPhongMaterial({ 
                color: color,
                shininess: 100,
                specular: 0x444444
            }));
        });
        
        this.previewCube = new THREE.Mesh(geometry, materials);
        this.previewScene.add(this.previewCube);
        
        // Luzes
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.previewScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.previewScene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0x00f3ff, 0.5);
        pointLight.position.set(-5, -5, -5);
        this.previewScene.add(pointLight);
    }
    
    updatePreviewCube() {
        if (!this.previewCube) return;
        
        const faceOrder = ['R', 'L', 'U', 'D', 'F', 'B'];
        const colorMap = {
            'white': 0xFFFFFF,
            'yellow': 0xFFD500,
            'red': 0xFF0000,
            'orange': 0xFF8C00,
            'blue': 0x0000FF,
            'green': 0x00FF00,
            'null': 0x333333
        };
        
        faceOrder.forEach((face, index) => {
            const faceData = this.cubeState[face];
            // Simplificação: mostrar cor do centro ou média
            const centerColor = faceData[4] || 'null';
            this.previewCube.material[index].color.setHex(colorMap[centerColor]);
            this.previewCube.material[index].emissive.setHex(centerColor !== 'null' ? colorMap[centerColor] : 0x000000);
            this.previewCube.material[index].emissiveIntensity = 0.3;
        });
    }
    
    animatePreview() {
        requestAnimationFrame(() => this.animatePreview());
        
        if (this.previewCube) {
            this.previewCube.rotation.x += 0.005;
            this.previewCube.rotation.y += 0.01;
        }
        
        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
    
    startDetectionLoop() {
        const processFrame = () => {
            if (!this.manualMode) {
                this.detectColors();
            }
            requestAnimationFrame(processFrame);
        };
        processFrame();
    }
    
    detectColors() {
        // Desenhar frame atual no canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Obter pixels do centro de cada célula da grade
        const gridRect = document.querySelector('.scan-grid').getBoundingClientRect();
        const videoRect = this.video.getBoundingClientRect();
        
        const scaleX = this.canvas.width / videoRect.width;
        const scaleY = this.canvas.height / videoRect.height;
        
        this.gridCells.forEach((cell, index) => {
            const rect = cell.getBoundingClientRect();
            const centerX = (rect.left + rect.width/2 - videoRect.left) * scaleX;
            const centerY = (rect.top + rect.height/2 - videoRect.top) * scaleY;
            
            if (centerX > 0 && centerX < this.canvas.width && 
                centerY > 0 && centerY < this.canvas.height) {
                
                const pixel = this.ctx.getImageData(centerX, centerY, 1, 1).data;
                const color = this.classifyColor(pixel[0], pixel[1], pixel[2]);
                
                if (color) {
                    cell.className = `grid-cell ${color}`;
                    if (index === 4) {
                        this.validateCenterColor(color);
                    }
                }
            }
        });
    }
    
    classifyColor(r, g, b) {
        // Algoritmo simples de classificação de cor
        const brightness = (r + g + b) / 3;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        // Branco (alto brilho, baixa saturação)
        if (brightness > 200 && diff < 30) return 'white';
        
        // Amarelo (R e G altos, B baixo)
        if (r > 150 && g > 150 && b < 100 && Math.abs(r - g) < 50) return 'yellow';
        
        // Vermelho (R alto, G e B baixos)
        if (r > 150 && g < 100 && b < 100) return 'red';
        
        // Laranja (R alto, G médio, B baixo)
        if (r > 150 && g > 80 && g < 150 && b < 80) return 'orange';
        
        // Verde (G alto, R e B baixos)
        if (g > 100 && r < 100 && b < 100) return 'green';
        
        // Azul (B alto, R e G baixos)
        if (b > 100 && r < 100 && g < 100) return 'blue';
        
        return null;
    }
    
    validateCenterColor(detectedColor) {
        const expectedColor = this.faceColors[this.currentFace];
        const instruction = document.getElementById('instruction');
        
        if (detectedColor === expectedColor) {
            instruction.textContent = `✓ Centro ${expectedColor.toUpperCase()} detectado!`;
            instruction.style.color = '#00ff00';
        } else {
            instruction.textContent = `✗ Centro deve ser ${expectedColor.toUpperCase()}`;
            instruction.style.color = '#ff0000';
        }
    }
    
    captureFace() {
        const face = this.faces[this.currentFace];
        const colors = [];
        
        this.gridCells.forEach((cell, index) => {
            const colorClass = Array.from(cell.classList).find(c => 
                ['white', 'yellow', 'red', 'orange', 'blue', 'green'].includes(c)
            );
            colors[index] = colorClass || null;
        });
        
        // Validar se centro está correto
        if (colors[4] !== this.faceColors[this.currentFace]) {
            alert(`O centro deve ser ${this.faceColors[this.currentFace].toUpperCase()}!`);
            return;
        }
        
        // Salvar estado
        this.cubeState[face] = colors;
        
        // Atualizar UI
        this.updateProgress();
        this.updatePreviewCube();
        
        // Próxima face ou finalizar
        if (this.currentFace < 5) {
            this.currentFace++;
            this.switchToNextFace();
        } else {
            this.completeScan();
        }
    }
    
    switchToNextFace() {
        const faceName = document.getElementById('currentFaceName');
        const instruction = document.getElementById('instruction');
        
        faceName.textContent = this.faceNames[this.currentFace];
        instruction.textContent = `Posicione a face ${this.faceNames[this.currentFace]} no centro`;
        instruction.style.color = 'var(--neon-cyan)';
        
        // Atualizar dots
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.remove('active');
            if (index < this.currentFace) dot.classList.add('completed');
            if (index === this.currentFace) dot.classList.add('active');
        });
        
        // Limpar grid visual
        this.gridCells.forEach(cell => {
            cell.className = 'grid-cell';
            if (cell.dataset.pos === '4') cell.classList.add('center');
        });
    }
    
    updateProgress() {
        // Atualizar preview 3D
        this.updatePreviewCube();
    }
    
    completeScan() {
        document.getElementById('btnConfirm').classList.remove('hidden');
        document.getElementById('instruction').textContent = '✓ Todas as faces capturadas!';
        document.getElementById('instruction').style.color = '#00ff00';
        
        // Efeito sonoro (opcional)
        this.playSound('complete');
    }
    
    toggleManualMode() {
        this.manualMode = !this.manualMode;
        const btn = document.getElementById('btnManual');
        
        if (this.manualMode) {
            btn.textContent = 'AUTO DETECTAR';
            btn.classList.add('active');
            alert('Modo manual: Selecione uma cor e toque nas células para pintar');
        } else {
            btn.textContent = 'AJUSTE MANUAL';
            btn.classList.remove('active');
        }
    }
    
    setCellColor(index, color) {
        this.gridCells[index].className = `grid-cell ${color}`;
        if (index === 4) this.validateCenterColor(color);
    }
    
    confirmCube() {
        // Validar se todas as faces estão preenchidas
        const isComplete = Object.values(this.cubeState).every(face => 
            face.every(color => color !== null)
        );
        
        if (!isComplete) {
            alert('Complete todas as faces primeiro!');
            return;
        }
        
        // Converter para formato do solver
        const cubeString = this.convertToCubeString();
        
        // Salvar no localStorage
        localStorage.setItem('cubeState', JSON.stringify({
            state: this.cubeState,
            cubeString: cubeString
        }));
        
        // Transição para solution
        document.getElementById('scanner').classList.remove('active');
        document.getElementById('loading').classList.add('active');
        
        setTimeout(() => {
            window.location.href = 'solution.html';
        }, 1500);
    }
    
    convertToCubeString() {
        // Formato: UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
        const order = ['U', 'R', 'F', 'D', 'L', 'B'];
        const colorToChar = {
            'white': 'U', 'yellow': 'D', 'red': 'R',
            'orange': 'L', 'blue': 'B', 'green': 'F'
        };
        
        let result = '';
        order.forEach(face => {
            this.cubeState[face].forEach(color => {
                result += colorToChar[color] || 'U';
            });
        });
        
        return result;
    }
    
    playSound(type) {
        // Placeholder para efeitos sonoros
        // Implementar com Web Audio API se desejado
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('scanner')) {
        window.scanner = new CubeScanner();
    }
});
