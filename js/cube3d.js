class CubeSolver {
    constructor(cubeData) {
        this.cubeData = cubeData;
        this.container = document.getElementById('cubeContainer');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.cubeGroup = null;
        this.cubies = [];
        
        this.solution = [];
        this.currentMove = 0;
        this.isPlaying = false;
        this.animationSpeed = 1;
        this.isAnimating = false;
        
        this.colors = {
            'U': 0xFFFFFF,  // White
            'D': 0xFFD500,  // Yellow
            'R': 0xFF0000,  // Red
            'L': 0xFF8C00,  // Orange
            'F': 0x00FF00,  // Green
            'B': 0x0000FF,  // Blue
            'X': 0x111111   // Inner
        };
        
        this.init();
    }
    
    async init() {
        this.setupThreeJS();
        this.createRubiksCube();
        this.setupControls();
        await this.solveCube();
        this.setupEventListeners();
    }
    
    setupThreeJS() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
        
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(5, 4, 6);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Luzes neon
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0x00f3ff, 1, 100);
        pointLight1.position.set(10, 10, 10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff00ff, 1, 100);
        pointLight2.position.set(-10, -10, -10);
        this.scene.add(pointLight2);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);
        
        // Controles
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Resize handler
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.animate();
    }
    
    createRubiksCube() {
        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        
        // Criar 27 cubinhos (3x3x3)
        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const materials = this.getMaterialsForPosition(x, y, z);
                    const cubie = new THREE.Mesh(geometry, materials);
                    
                    cubie.position.set(x, y, z);
                    cubie.userData = { x, y, z, originalPos: { x, y, z } };
                    
                    this.cubeGroup.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
        
        // Aplicar estado inicial do cubo escaneado
        this.applyInitialState();
    }
    
    getMaterialsForPosition(x, y, z) {
        // Determinar quais faces são visíveis para cada cubinho
        const materials = [];
        
        // Ordem: right, left, top, bottom, front, back
        const faces = [
            x === 1 ? 'R' : 'X',
            x === -1 ? 'L' : 'X',
            y === 1 ? 'U' : 'X',
            y === -1 ? 'D' : 'X',
            z === 1 ? 'F' : 'X',
            z === -1 ? 'B' : 'X'
        ];
        
        faces.forEach(face => {
            materials.push(new THREE.MeshPhongMaterial({
                color: this.colors[face],
                shininess: 100,
                specular: 0x444444
            }));
        });
        
        return materials;
    }
    
    applyInitialState() {
        // Mapear estado escaneado para as faces dos cubinhos
        // Simplificação: aplicar cores baseadas no estado salvo
        const state = this.cubeData.state;
        
        // Atualizar materiais baseado no estado
        this.cubies.forEach(cubie => {
            const { x, y, z } = cubie.userData;
            
            // Determinar quais faces atualizar
            if (x === 1) this.updateFaceColor(cubie, 0, state.R, this.getFaceIndex(x, y, z, 'R'));
            if (x === -1) this.updateFaceColor(cubie, 1, state.L, this.getFaceIndex(x, y, z, 'L'));
            if (y === 1) this.updateFaceColor(cubie, 2, state.U, this.getFaceIndex(x, y, z, 'U'));
            if (y === -1) this.updateFaceColor(cubie, 3, state.D, this.getFaceIndex(x, y, z, 'D'));
            if (z === 1) this.updateFaceColor(cubie, 4, state.F, this.getFaceIndex(x, y, z, 'F'));
            if (z === -1) this.updateFaceColor(cubie, 5, state.B, this.getFaceIndex(x, y, z, 'B'));
        });
    }
    
    getFaceIndex(x, y, z, face) {
        // Mapear posição 3D para índice 0-8 da face
        // Simplificação: retornar índice baseado na posição
        const posMap = {
            'R': (y, z) => (1-y)*3 + (z+1),
            'L': (y, z) => (1-y)*3 + (1-z),
            'U': (x, z) => (1-x)*3 + (z+1),
            'D': (x, z) => (x+1)*3 + (z+1),
            'F': (x, y) => (1-y)*3 + (x+1),
            'B': (x, y) => (1-y)*3 + (1-x)
        };
        
        if (face === 'R') return posMap[face](y, z);
        if (face === 'L') return posMap[face](y, z);
        if (face === 'U') return posMap[face](x, z);
        if (face === 'D') return posMap[face](x, z);
        if (face === 'F') return posMap[face](x, y);
        if (face === 'B') return posMap[face](x, y);
        return 4;
    }
    
    updateFaceColor(cubie, materialIndex, faceState, index) {
        const colorName = faceState[index];
        const colorMap = {
            'white': 'U', 'yellow': 'D', 'red': 'R',
            'orange': 'L', 'blue': 'B', 'green': 'F'
        };
        const colorChar = colorMap[colorName] || 'X';
        cubie.material[materialIndex].color.setHex(this.colors[colorChar]);
    }
    
    async solveCube() {
        // Inicializar solver
        Cube.initSolver();
        
        // Criar instância do cubo
        const cube = Cube.fromString(this.cubeData.cubeString);
        
        // Resolver
        const solution = cube.solve();
        this.solution = solution.split(' ');
        
        this.updateDisplay();
    }
    
    setupControls() {
        document.getElementById('btnPlay').addEventListener('click', () => this.togglePlay());
        document.getElementById('btnNext').addEventListener('click', () => this.nextMove());
        document.getElementById('btnPrev').addEventListener('click', () => this.prevMove());
        document.getElementById('btnBack').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        document.getElementById('speedRange').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.animationSpeed + 'x';
        });
    }
    
    setupEventListeners() {
        // Touch controls para mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        this.container.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 50) this.nextMove();
                else if (diffX < -50) this.prevMove();
            }
        });
    }
    
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const btn = document.getElementById('btnPlay');
        btn.textContent = this.isPlaying ? '⏸ PAUSE' : '▶ PLAY';
        
        if (this.isPlaying) {
            this.playLoop();
        }
    }
    
    async playLoop() {
        while (this.isPlaying && this.currentMove < this.solution.length) {
            await this.executeMove(this.solution[this.currentMove]);
            this.currentMove++;
            this.updateDisplay();
            
            if (this.currentMove >= this.solution.length) {
                this.isPlaying = false;
                document.getElementById('btnPlay').textContent = '▶ REPLAY';
            }
            
            await this.sleep(1000 / this.animationSpeed);
        }
    }
    
    async executeMove(move) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        const face = move.charAt(0);
        const direction = move.includes("'") ? -1 : (move.includes('2') ? 2 : 1);
        
        await this.animateRotation(face, direction);
        
        this.isAnimating = false;
    }
    
    animateRotation(face, direction) {
        return new Promise((resolve) => {
            const axis = this.getAxis(face);
            const layer = this.getLayer(face);
            
            const rotationGroup = new THREE.Group();
            this.scene.add(rotationGroup);
            
            // Adicionar cubinhos da camada ao grupo
            const affectedCubies = this.cubies.filter(cubie => {
                const pos = cubie.position;
                if (face === 'R') return pos.x > 0.5;
                if (face === 'L') return pos.x < -0.5;
                if (face === 'U') return pos.y > 0.5;
                if (face === 'D') return pos.y < -0.5;
                if (face === 'F') return pos.z > 0.5;
                if (face === 'B') return pos.z < -0.5;
                return false;
            });
            
            affectedCubies.forEach(cubie => {
                rotationGroup.attach(cubie);
            });
            
            // Animação
            const duration = 500 / this.animationSpeed;
            const startTime = Date.now();
            const targetRotation = direction * Math.PI / 2;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                
                if (face === 'R' || face === 'L') rotationGroup.rotation.x = targetRotation * eased;
                if (face === 'U' || face === 'D') rotationGroup.rotation.y = targetRotation * eased;
                if (face === 'F' || face === 'B') rotationGroup.rotation.z = targetRotation * eased;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Finalizar rotação
                    rotationGroup.updateMatrixWorld();
                    affectedCubies.forEach(cubie => {
                        this.cubeGroup.attach(cubie);
                        cubie.updateMatrix();
                        cubie.matrix.decompose(cubie.position, cubie.quaternion, cubie.scale);
                    });
                    
                    this.scene.remove(rotationGroup);
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    getAxis(face) {
        if (face === 'R' || face === 'L') return 'x';
        if (face === 'U' || face === 'D') return 'y';
        return 'z';
    }
    
    getLayer(face) {
        if (['R', 'U', 'F'].includes(face)) return 1;
        return -1;
    }
    
    nextMove() {
        if (this.currentMove < this.solution.length && !this.isAnimating) {
            this.executeMove(this.solution[this.currentMove]);
            this.currentMove++;
            this.updateDisplay();
        }
    }
    
    prevMove() {
        if (this.currentMove > 0 && !this.isAnimating) {
            this.currentMove--;
            // Inverter movimento
            const move = this.solution[this.currentMove];
            const inverse = move.includes("'") ? move.replace("'", "") : move + "'";
            this.executeMove(inverse);
            this.updateDisplay();
        }
    }
    
    updateDisplay() {
        const currentMove = this.solution[this.currentMove] || '--';
        document.getElementById('currentMove').textContent = currentMove;
        document.getElementById('moveCount').textContent = `${this.currentMove} / ${this.solution.length}`;
        
        // Atualizar algoritmo com highlight
        const algorithmHTML = this.solution.map((move, index) => {
            if (index === this.currentMove) {
                return `<span class="current-step">${move}</span>`;
            }
            return move;
        }).join(' ');
        
        document.getElementById('algorithmDisplay').innerHTML = algorithmHTML;
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
