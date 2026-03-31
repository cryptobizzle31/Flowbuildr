// =============================================
// FLOWBUILDR — Enhanced Interactions & Animations
// =============================================

document.addEventListener('DOMContentLoaded', () => {

    // --- THEME TOGGLE ---
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('flowbuildr-theme');

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';

        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('flowbuildr-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('flowbuildr-theme', 'light');
        }
    });

    // --- SCROLL PROGRESS BAR ---
    const scrollProgress = document.getElementById('scrollProgress');

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        scrollProgress.style.width = scrollPercent + '%';
    }, { passive: true });

    // --- SCROLL REVEAL ---
    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal--visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => revealObserver.observe(el));

    // --- NAVBAR SCROLL EFFECT ---
    const nav = document.getElementById('nav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.classList.add('nav--scrolled');
        } else {
            nav.classList.remove('nav--scrolled');
        }
    }, { passive: true });

    // --- MOBILE NAV TOGGLE ---
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('nav__links--open');
        const spans = navToggle.querySelectorAll('span');
        if (navLinks.classList.contains('nav__links--open')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('nav__links--open');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });

    // --- FAQ ACCORDION ---
    const faqItems = document.querySelectorAll('.faq__item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq__question');
        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('faq__item--open');
            faqItems.forEach(i => i.classList.remove('faq__item--open'));
            if (!isOpen) {
                item.classList.add('faq__item--open');
            }
            faqItems.forEach(i => {
                const btn = i.querySelector('.faq__question');
                btn.setAttribute('aria-expanded', i.classList.contains('faq__item--open'));
            });
        });
    });

    // --- SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = nav.offsetHeight + 20;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // --- COUNT-UP ANIMATION FOR SOCIAL PROOF ---
    const counters = document.querySelectorAll('.social-proof__number[data-count]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                const prefix = el.dataset.prefix || '';
                const duration = 1500;
                const start = performance.now();

                function animate(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(eased * target);
                    el.textContent = prefix + current + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                }

                requestAnimationFrame(animate);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(el => counterObserver.observe(el));

    // --- FLOW NETWORK CANVAS ANIMATION ---
    const canvas = document.getElementById('flowCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height, nodes, edges, pulses;
        const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light';

        function initFlow() {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;

            // Create nodes in a spread-out organic layout
            const nodeCount = Math.max(12, Math.floor((width * height) / 40000));
            nodes = [];
            for (let i = 0; i < nodeCount; i++) {
                nodes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    baseX: 0,
                    baseY: 0,
                    radius: Math.random() * 2.5 + 1.5,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    phase: Math.random() * Math.PI * 2
                });
                nodes[i].baseX = nodes[i].x;
                nodes[i].baseY = nodes[i].y;
            }

            // Create edges between nearby nodes
            edges = [];
            const maxDist = Math.min(width, height) * 0.25;
            for (let i = 0; i < nodes.length; i++) {
                let connections = 0;
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist && connections < 3) {
                        edges.push({ from: i, to: j, dist: dist });
                        connections++;
                    }
                }
            }

            // Create pulses that travel along edges
            pulses = [];
            for (let i = 0; i < Math.min(edges.length, 8); i++) {
                const edgeIdx = Math.floor(Math.random() * edges.length);
                pulses.push({
                    edge: edgeIdx,
                    progress: Math.random(),
                    speed: 0.002 + Math.random() * 0.003,
                    size: 2 + Math.random() * 2
                });
            }
        }

        let time = 0;
        function drawFlow() {
            ctx.clearRect(0, 0, width, height);
            time += 0.005;

            const light = isLightTheme();
            const tealR = light ? 42 : 56;
            const tealG = light ? 157 : 191;
            const tealB = light ? 143 : 167;

            // Drift nodes gently
            nodes.forEach((node, i) => {
                node.x = node.baseX + Math.sin(time + node.phase) * 20;
                node.y = node.baseY + Math.cos(time * 0.7 + node.phase) * 15;
            });

            // Draw edges
            edges.forEach(edge => {
                const a = nodes[edge.from];
                const b = nodes[edge.to];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const opacity = Math.max(0, 0.12 - (dist / (Math.min(width, height) * 0.25)) * 0.1);

                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(${tealR}, ${tealG}, ${tealB}, ${opacity})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            });

            // Draw nodes
            nodes.forEach(node => {
                const pulse = 1 + Math.sin(time * 2 + node.phase) * 0.3;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${tealR}, ${tealG}, ${tealB}, 0.25)`;
                ctx.fill();

                // Glow halo
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * pulse * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${tealR}, ${tealG}, ${tealB}, 0.03)`;
                ctx.fill();
            });

            // Draw pulses traveling along edges
            pulses.forEach(pulse => {
                pulse.progress += pulse.speed;
                if (pulse.progress > 1) {
                    pulse.progress = 0;
                    pulse.edge = Math.floor(Math.random() * edges.length);
                }

                const edge = edges[pulse.edge];
                if (!edge) return;
                const a = nodes[edge.from];
                const b = nodes[edge.to];
                const x = a.x + (b.x - a.x) * pulse.progress;
                const y = a.y + (b.y - a.y) * pulse.progress;

                // Bright pulse dot
                ctx.beginPath();
                ctx.arc(x, y, pulse.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${tealR}, ${tealG}, ${tealB}, 0.6)`;
                ctx.fill();

                // Pulse glow
                ctx.beginPath();
                ctx.arc(x, y, pulse.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${tealR}, ${tealG}, ${tealB}, 0.08)`;
                ctx.fill();
            });

            requestAnimationFrame(drawFlow);
        }

        initFlow();
        drawFlow();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(initFlow, 200);
        });
    }

    // --- MAGNETIC CURSOR EFFECT ON CTA BUTTONS ---
    const magneticBtns = document.querySelectorAll('.btn--magnetic');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
            btn.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => {
                btn.style.transition = '';
            }, 400);
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transition = 'none';
        });
    });

});
