document.addEventListener('DOMContentLoaded', async () => {
    // Cargar el header primero porque es esencial para la UI inicial
    await loadComponent('header-placeholder', 'html/header.html', true);

    // Cargar los componentes restantes en paralelo
    Promise.all([
        loadComponent('footer-placeholder', 'html/footer.html', false, true), // isOptional = true
        loadComponent('icons-placeholder', 'html/icons.html')
    ]).then(() => {
        // Una vez que el footer y la barra lateral están cargados, ejecutar la lógica que los conecta
        loadComponent('footer-social-icons', 'html/nav_icons.html'); // Cargar iconos dentro del footer
        
        const yearSpan = document.getElementById('copyright-year'); // Actualizar año
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        
        const socialSidebar = document.querySelector('.social-sidebar');
        const footer = document.querySelector('.footer-main');
        
        if (socialSidebar && footer) {
            const footerObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => socialSidebar.classList.toggle('hidden', entry.isIntersecting));
            }, { threshold: 0.1 });
            footerObserver.observe(footer);
        }
    }).catch(err => console.error("Error cargando componentes secundarios:", err));
});

/**
 * Carga un archivo HTML en un contenedor específico
 * @param {string} id El ID del contenedor.
 * @param {string} path La ruta al archivo HTML.
 * @param {boolean} isLast Indica si este es el último componente en cargar para inicializar la UI.
 * @param {boolean} isOptional Si es true, un error 404 no detendrá la ejecución.
 */
async function loadComponent(id, path, isLast = false, isOptional = false) {
    const container = document.getElementById(id);
    if (!container) { if (isOptional) { return; } else { console.error(`Contenedor con ID "${id}" no encontrado.`); return; } }
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        container.innerHTML = html;
        if (isLast) initUI(); // Iniciar UI tan pronto como el header esté listo
    } catch (err) {
        if (isOptional && err.message.includes('404')) {
            console.warn(`Componente opcional no encontrado en ${path}. Omitiendo.`);
        }
        console.error(`Error al cargar el componente ${path}:`, err);
    }
}

function initUI() {
    // Ocultar el preloader
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.style.display = 'none', 800);
    }

    // Inicializar todos los módulos de la UI
    setupTheme();
    setupNavbar();
    setupScrollSpy();
    setupRevealAnimations();
    setupBannerDescription();
    setupAutoAccordions();
    setupDynamicModals();

    // La delegación de eventos ya está configurada globalmente al final del archivo
}

/** Configura el interruptor de tema (claro/oscuro) */
function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        // Sincronizar tema en iframes abiertos (si aplica)
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentWindow && iframe.contentDocument && iframe.contentDocument.body && iframe.origin === window.location.origin) {
                    iframe.contentDocument.body.classList.toggle('dark-mode', isDark);
                }
            } catch (e) {
                // Ignorar errores de seguridad con iframes de origen cruzado
            }
        });
    });
}

/** Configura la navegación principal, enlaces y scrollspy */
function setupNavbar() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentHash = window.location.hash;
    const isIndexPage = currentPath === 'index.html' || currentPath === '';

    navLinks.forEach(link => {
        let href = link.getAttribute('href') || '';
        const linkFile = href.split('#')[0].split('/').pop() || 'index.html';
        const hash = href.includes('#') ? '#' + href.split('#')[1] : '';
        
        const isCurrentPageLink = linkFile === currentPath;
        const isAnchorForCurrentPage = isIndexPage && hash;

        if (isCurrentPageLink && !isAnchorForCurrentPage) {
            link.classList.add('active');
        } else if (isIndexPage && hash === currentHash) {
            link.classList.add('active');
        } else if (isIndexPage && (currentHash === '' || currentHash === '#') && href.endsWith('#inicio')) {
             link.classList.add('active');
        } else {
            link.classList.remove('active');
        }

        link.addEventListener('click', function(e) {
            if (hash && (linkFile === currentPath || (currentPath === 'index.html' && linkFile === ''))) {
                const targetElement = document.querySelector(hash);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    navLinks.forEach(l => l.classList.remove('active')); // Actualizar estado visual
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

    window.addEventListener('scroll', handleNavbarScroll);
    handleNavbarScroll();
}

/** Configura las animaciones de revelado al hacer scroll */
function setupRevealAnimations() {
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
}

/** Configura el ScrollSpy para actualizar la navegación activa */
function setupScrollSpy() {
    const isIndexPage = (window.location.pathname.split('/').pop() || 'index.html') === 'index.html';
    if (isIndexPage) {
        const spySections = document.querySelectorAll('header[id], section[id]');
        const spyObserver = new IntersectionObserver((entries) => {
            const visibleSection = entries.find(entry => entry.isIntersecting)?.target;
            if (!visibleSection) return;

            const id = visibleSection.getAttribute('id');
            const activeLink = document.querySelector(`.nav-link[href$="#${id}"]`);

            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }, {
            rootMargin: '-20% 0px -75% 0px'
        });

        spySections.forEach(section => spyObserver.observe(section));
    }
}

/** Configura la descripción flotante en el banner */
function setupBannerDescription() {
    // Lógica para la descripción compartida en el banner
    const logoContainer = document.querySelector('.child-logos-container');
    const toastContainer = document.getElementById('toast-description');
    const toastText = document.getElementById('toast-description-text');

    if (logoContainer && toastContainer && toastText) {
        const logoLinks = logoContainer.querySelectorAll('.child-logo-link');
        
        logoLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                toastText.textContent = link.dataset.description || '';
                toastContainer.classList.add('show');
            });
        });

        logoContainer.addEventListener('mouseleave', () => {
            toastContainer.classList.remove('show');
        });
    }
}

/** Configura los acordeones que se despliegan con scroll o hover */
function setupAutoAccordions() {
    const SCROLL_THRESHOLD = 0.6;
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
}

/** Configura los disparadores de modales para cargar contenido dinámico */
function setupDynamicModals() {
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(trigger => {
        const targetModalId = trigger.getAttribute('data-bs-target');
        if (!targetModalId) return;

        const targetModal = document.querySelector(targetModalId);
        const contentPath = trigger.getAttribute('data-content-path');

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

    // Mostrar un estado de carga mientras se obtiene el contenido
    modalBody.innerHTML = `<div class="d-flex justify-content-center align-items-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>`;
    modal.show();
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        modalBody.innerHTML = html;
    } catch (err) {
        console.error(`Error cargando contenido para el modal ${modalSelector}:`, err);
        modalBody.innerHTML = `<p class="p-4 text-danger">Error al cargar el contenido. Por favor, intente más tarde.</p>`;
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

    const isScrolled = window.scrollY > 80;
    navbar.classList.toggle('navbar-on-hero', !isScrolled);
    navbar.classList.toggle('scrolled', isScrolled);
    navbar.classList.toggle('shadow-lg', isScrolled);
}

/**
 * Actualiza el contenido de la tarjeta de servicios de documentos.
 * @param {HTMLElement} serviceItem - El elemento del botón de servicio que fue activado.
 */
function updateDocServiceContent(serviceItem) {
    const container = serviceItem.closest('.doc-card-container');
    if (!container) return;

    // 1. Actualizar estado activo del botón
    const siblings = container.querySelectorAll('.doc-service-item');
    siblings.forEach(sib => sib.classList.remove('active'));
    serviceItem.classList.add('active');

    // 2. Obtener datos y actualizar contenido
    const { title, text, img } = serviceItem.dataset;
    const contentDisplay = container.querySelector('.doc-content-display');
    const contentImg = contentDisplay.querySelector('img');
    const contentTitle = contentDisplay.querySelector('.doc-content-title');
    const contentText = contentDisplay.querySelector('.doc-content-text');

    contentImg.src = img; contentImg.alt = title; contentTitle.textContent = title; contentText.textContent = text;
}

// --- DELEGACIÓN DE EVENTOS GLOBALES ---
// Usar delegación de eventos en el `document` es eficiente y funciona
// para contenido cargado dinámicamente (como en los modales).

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

    const serviceItem = event.target.closest('.doc-service-item');
    if (serviceItem) {
        updateDocServiceContent(serviceItem);
    }

    const contactBtn = event.target.closest('.contact-btn');
    if (contactBtn) {
        handleContact(contactBtn.dataset.type);
    }

    const socialLink = event.target.closest('.js-social-popup');
    if (socialLink) {
        event.preventDefault();
        const url = socialLink.href;
        const windowName = 'socialPopup';
        const width = 800;
        const height = 600;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);
        const windowFeatures = `width=${width},height=${height},scrollbars=yes,resizable=yes,left=${left},top=${top}`;
        window.open(url, windowName, windowFeatures);
    }
});

document.addEventListener('mouseover', function (event) {
    const serviceItem = event.target.closest('.doc-service-item');
    if (serviceItem) {
        updateDocServiceContent(serviceItem);
    }
});