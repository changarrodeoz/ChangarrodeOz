document.addEventListener('DOMContentLoaded', async () => {
    // Carga de componentes externos
    await loadComponent('header-placeholder', 'html/header.html');
    await loadComponent('footer-placeholder', 'html/footer.html');
    await loadComponent('icons-placeholder', 'html/icons.html');

    // Inicializar lógica de la UI tras cargar componentes
    initUI();
});

/**
 * Carga un archivo HTML en un contenedor específico
 */
async function loadComponent(id, path) {
    const container = document.getElementById(id);
    if (!container) return;
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        container.innerHTML = html;
    } catch (err) {
        console.error(`Error cargando ${path}:`, err);
    }
}

function initUI() {
    // Configuración de visualización
    const SCROLL_THRESHOLD = 0.6; // Umbral optimizado para secciones centradas

    const contactButtons = document.querySelectorAll('.contact-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    const themeToggle = document.getElementById('theme-toggle');

    // Lógica de Temas (Light/Dark)
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Dark por defecto para sofisticación tech
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);

        // Sincronizar dinámicamente cualquier iframe (modal) abierto
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentWindow && iframe.contentDocument && iframe.contentDocument.body && iframe.origin === window.location.origin) {
                    if (isDark) {
                        iframe.contentDocument.body.classList.add('dark-mode');
                    } else {
                        iframe.contentDocument.body.classList.remove('dark-mode');
                    }
                }
            } catch (e) {
                // Ignorar posibles restricciones de seguridad si el iframe fuera externo
            }
        });
    });

    // Quitar preloader después de cargar
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.style.opacity = '0';
        // Sincronizado con la transición de 0.8s en el CSS para una salida fluida
        setTimeout(() => preloader.style.display = 'none', 800);
    }, 1800);

    contactButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.currentTarget.getAttribute('data-type');
            handleContact(type);
        });
    });

    // Gestionar estado activo de la navegación basado en la URL actual
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentHash = window.location.hash;

    navLinks.forEach(link => {
        let href = link.getAttribute('href') || '';
        
        // Obtener solo el nombre del archivo del enlace (ej: de "index.html#inicio" a "index.html")
        const linkFile = href.split('#')[0].split('/').pop() || 'index.html';
        const hash = href.includes('#') ? '#' + href.split('#')[1] : '';
        
        // Marcar como activo solo si el archivo coincide y el hash es el adecuado
        const isSamePage = linkFile === currentPath;
        const isCorrectHash = hash === currentHash || (currentHash === '' && (hash === '#inicio' || hash === ''));

        if (isSamePage && isCorrectHash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }

        link.addEventListener('click', function(e) {
            // Si el enlace tiene un ancla y apunta a la página actual o a index.html estando en la raíz
            if (hash && (linkFile === currentPath || (currentPath === 'index.html' && linkFile === ''))) {
                const targetElement = document.querySelector(hash);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    
                    // Actualizar estado visual
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Cerrar menú móvil si está desplegado
                    const navbarCollapse = document.getElementById('navbarNav');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        bootstrap.Collapse.getInstance(navbarCollapse).hide();
                    }
                }
            }
        });
    });

    // Efecto de navbar al hacer scroll (registrado después de la inyección)
    window.addEventListener('scroll', handleNavbarScroll);
    
    // Ejecutar una vez al inicio por si la página ya tiene scroll
    handleNavbarScroll();

    // Animación de revelado al hacer scroll
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ScrollSpy: Detectar la sección activa dinámicamente al hacer scroll
    if (currentPath === 'index.html' || currentPath === '') {
        const spySections = document.querySelectorAll('header[id], section[id]');
        const spyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Si la sección ocupa la zona superior de la pantalla (20% al 70%)
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        const href = link.getAttribute('href') || '';
                        // Verificamos si el enlace apunta al ID de la sección visible
                        if (href.endsWith(`#${id}`)) {
                            link.classList.add('active');
                        } else {
                            link.classList.remove('active');
                        }
                    });
                }
            });
        }, {
            rootMargin: '-20% 0px -75% 0px' // Margen para activar el enlace justo antes de que la sección llegue arriba
        });
        spySections.forEach(section => spyObserver.observe(section));
    }

    /**
     * Activa un servicio de forma permanente (solo anima la apertura)
     */
    const activateService = (collapseElement) => {
        if (!collapseElement) return;
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false });
        bsCollapse.show();
    };

    // Observador para el despliegue automático por Scroll
    const accordionScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const collapseElement = entry.target.querySelector('.accordion-collapse');
            if (!collapseElement) return;

            if (entry.isIntersecting) {
                // Una vez detectado, se despliega y no se vuelve a ocultar
                activateService(collapseElement);
            }
        });
    }, { threshold: SCROLL_THRESHOLD });

    document.querySelectorAll('.accordion-item').forEach(item => {
        accordionScrollObserver.observe(item);

        // Interacción por Mouse (Hover)
        item.addEventListener('mouseenter', () => {
            activateService(item.querySelector('.accordion-collapse'));
        });
    });

    // Lógica mejorada para modales sin iframes
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(trigger => {
        const targetModalId = trigger.getAttribute('data-bs-target');
        if (!targetModalId) return;

        const targetModal = document.querySelector(targetModalId);
        const contentPath = trigger.getAttribute('data-content-path');

        // Solo actuar sobre los modales que cargarán contenido dinámico
        if (targetModal && contentPath) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                openModalWithContent(targetModalId, contentPath);
            });
        }
    });
}

/**
 * Carga contenido HTML en un modal dinámicamente usando fetch.
 * @param {string} modalSelector - El selector CSS para el modal (ej: '#modalArq').
 * @param {string} path - La ruta al archivo HTML a cargar.
 */
async function openModalWithContent(modalSelector, path) {
    const modalElement = document.querySelector(modalSelector);
    if (!modalElement) return;

    const modalBody = modalElement.querySelector('.modal-body');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        modalBody.innerHTML = html;
        modal.show();
    } catch (err) {
        console.error(`Error cargando contenido para el modal ${modalSelector}:`, err);
        modalBody.innerHTML = `<p class="p-4 text-danger">Error al cargar el contenido. Por favor, intente más tarde.</p>`;
        modal.show();
    }
}

/**
 * Maneja la redirección de contacto
 * @param {string} type - Tipo de contacto (whatsapp/email)
 */
function handleContact(type) {
    if (type === 'whatsapp') {
        // Sincronizado con el número de la barra lateral
        window.open('https://wa.me/50253534441?text=Hola, me interesa un servicio de El Changarro de OZ', '_blank');
    } else {
        window.location.href = 'mailto:changarrodeoz@gmail.com?subject=Consulta de Servicios';
    }
}

/**
 * Controla la apariencia visual de la barra de navegación según el scroll
 */
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    if (window.scrollY > 80) {
        navbar.classList.add('scrolled');
        navbar.classList.add(document.body.classList.contains('dark-mode') ? 'shadow-lg' : 'shadow-sm');
    } else {
        navbar.classList.remove('scrolled', 'shadow', 'shadow-lg', 'shadow-sm');
    }
}

// Delegación de eventos para el Lightbox, para que funcione con contenido cargado dinámicamente
document.addEventListener('click', function (event) {
    if (event.target.matches('.img-service-deploy')) {
        const lightboxElement = document.getElementById('modalLightbox');
        if (lightboxElement) {
            const lightboxModal = bootstrap.Modal.getOrCreateInstance(lightboxElement);
            const lightboxImg = document.getElementById('lightboxImage');
            lightboxImg.src = event.target.src;
            lightboxModal.show();
        }
    }
});