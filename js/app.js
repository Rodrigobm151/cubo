// App principal - gerenciamento de navegação e estado
class NeonCubeApp {
    constructor() {
        this.init();
    }
    
    init() {
        // Verificar suporte a câmera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Seu navegador não suporta acesso à câmera. Use Chrome ou Safari atualizado.');
        }
        
        // Prevenir scroll em mobile
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.scan-grid') || e.target.closest('.cube-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevenir zoom
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());
    }
}

// Inicializar app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeonCubeApp();
});
