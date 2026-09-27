(() => {
  const config = window.RSVP_CONFIG || {};
  const form = document.getElementById('rsvpForm');
  const steps = [...document.querySelectorAll('.wizard-step')];
  const navSteps = [...document.querySelectorAll('.wizard-step-dot')];
  const totalInput = document.getElementById('totalPessoasInput');
  const criancasInput = document.getElementById('criancasInput');
  const nome = document.getElementById('nome');
  const totalError = document.getElementById('totalError');
  const criancasError = document.getElementById('criancasError');
  const nomeError = document.getElementById('nomeError');
  const statusMessage = document.getElementById('statusMessage');
  const nextBtn = document.getElementById('nextBtn');
  const backBtn = document.getElementById('backBtn');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const attendBtn = document.getElementById('attendBtn');
  const declineBtn = document.getElementById('declineBtn');
  const rsvpCard = document.getElementById('confirmar');
  const successCard = document.getElementById('successCard');
  const successEyebrow = document.getElementById('successEyebrow');
  const successTitle = document.getElementById('successTitle');
  const successText = document.getElementById('successText');
  const successRecap = document.getElementById('successRecap');
  const newResponseBtn = document.getElementById('newResponseBtn');
  const responseDeadline = new Date('2026-10-05T00:00:00-04:00').getTime();
  let currentStep = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.parseInt(value, 10) || 0));
  const plural = (value, one, many) => `${value} ${value === 1 ? one : many}`;
  const deadlineClosed = () => Date.now() >= responseDeadline;

  function showDeadlineMessage() {
    statusMessage.textContent = 'O prazo para envio das respostas terminou em 04/10/2026.';
  }

  function clearErrors() {
    totalError.textContent = '';
    criancasError.textContent = '';
    nomeError.textContent = '';
    statusMessage.textContent = '';
  }

  function getState() {
    const total = clamp(totalInput.value, 1, 30);
    const criancas = clamp(criancasInput.value, 0, total);
    const adultos = Math.max(0, total - criancas);
    return { total, criancas, adultos };
  }

  function syncState() {
    const state = getState();
    totalInput.value = state.total;
    criancasInput.max = state.total;
    criancasInput.value = state.criancas;
    document.getElementById('kidsTotalReference').textContent = plural(state.total, 'pessoa', 'pessoas');
    document.getElementById('adultosPreview').textContent = state.adultos;
    document.getElementById('summaryTotal').textContent = plural(state.total, 'pessoa', 'pessoas');
    document.getElementById('summaryKids').textContent = state.criancas;
    document.getElementById('summaryAdults').textContent = state.adultos;
    return state;
  }

  function validateStep(stepIndex) {
    clearErrors();
    if (deadlineClosed()) {
      showDeadlineMessage();
      return false;
    }
    const state = syncState();
    if (stepIndex === 1 && (state.total < 1 || state.total > 30)) {
      totalError.textContent = 'Informe entre 1 e 30 pessoas.';
      return false;
    }
    if (stepIndex === 2 && state.criancas > state.total) {
      criancasError.textContent = 'A quantidade de crianças não pode ser maior que o total de pessoas.';
      return false;
    }
    if (stepIndex === 3) {
      const cleanName = nome.value.trim().replace(/\s+/g, ' ');
      if (cleanName.length < 2) {
        nomeError.textContent = 'Informe seu nome para concluir a confirmação.';
        nome.focus();
        return false;
      }
    }
    return true;
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((step, i) => {
      const active = i === currentStep;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
    });
    navSteps.forEach((item, i) => {
      item.classList.toggle('is-active', i === currentStep);
      item.classList.toggle('is-complete', i < currentStep);
      item.setAttribute('aria-current', i === currentStep ? 'step' : 'false');
    });
    backBtn.hidden = currentStep === 0;
    nextBtn.hidden = currentStep === 0 || currentStep === steps.length - 1;
    submitBtn.hidden = currentStep !== steps.length - 1;
    syncState();
    clearErrors();

    const focusTarget = currentStep === 0 ? attendBtn
      : currentStep === 1 ? totalInput
      : currentStep === 2 ? criancasInput
      : currentStep === 3 ? nome
      : submitBtn;
    setTimeout(() => focusTarget?.focus({ preventScroll: true }), 120);

    if (deadlineClosed()) {
      showDeadlineMessage();
      attendBtn.disabled = true;
      declineBtn.disabled = true;
      nextBtn.disabled = true;
      submitBtn.disabled = true;
    }
  }

  function showDeclineThankYou() {
    successEyebrow.textContent = 'Resposta concluída';
    successTitle.textContent = 'Obrigado por nos avisar!';
    successText.textContent = 'Sentiremos sua falta no Piquenique do Henri.';
    successRecap.innerHTML = '<span>Resposta: não participarei</span>';
    rsvpCard.hidden = true;
    successCard.hidden = false;
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  attendBtn.addEventListener('click', () => {
    if (deadlineClosed()) {
      showDeadlineMessage();
      return;
    }
    showStep(1);
  });

  declineBtn.addEventListener('click', () => {
    if (deadlineClosed()) {
      showDeadlineMessage();
      return;
    }
    showDeclineThankYou();
  });

  document.querySelectorAll('.wizard-stepper').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      const step = Number(button.dataset.step || 0);
      const min = Number(input.min || 0);
      const max = Number(input.max || 30);
      input.value = clamp(Number(input.value) + step, min, max);
      syncState();
      clearErrors();
    });
  });

  [totalInput, criancasInput].forEach(input => {
    input.addEventListener('input', () => { syncState(); clearErrors(); });
    input.addEventListener('change', syncState);
  });

  nome.addEventListener('input', () => {
    nomeError.textContent = '';
    statusMessage.textContent = '';
  });

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) showStep(currentStep + 1);
  });

  backBtn.addEventListener('click', () => showStep(currentStep - 1));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateStep(3)) return;
    if (document.getElementById('website').value) return;

    const endpoint = String(config.endpoint || '');
    if (!endpoint.startsWith('https://script.google.com/')) {
      statusMessage.textContent = 'A lista ainda não está conectada à planilha.';
      return;
    }

    const state = syncState();
    const cleanName = nome.value.trim().replace(/\s+/g, ' ');
    const payload = {
      nome: cleanName,
      totalPessoas: state.total,
      criancas: state.criancas,
      adultos: state.adultos,
      acompanhantes: Math.max(0, state.total - 1),
      origem: window.location.href,
      enviadoEm: new Date().toISOString(),
      website: ''
    };

    submitBtn.disabled = true;
    submitText.textContent = 'Enviando...';
    statusMessage.textContent = '';

    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      successEyebrow.textContent = 'Presença registrada';
      successTitle.textContent = 'Confirmação enviada!';
      successText.textContent = `${payload.nome}, recebemos a confirmação do seu grupo.`;
      const recap = [
        `👨‍👩‍👧‍👦 ${plural(payload.totalPessoas, 'pessoa', 'pessoas')}`,
        `🧑 ${plural(payload.adultos, 'adulto', 'adultos')}`,
        `🧒 ${plural(payload.criancas, 'criança', 'crianças')}`
      ];
      successRecap.innerHTML = recap.map(item => `<span>${item}</span>`).join('');
      rsvpCard.hidden = true;
      successCard.hidden = false;
      successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      launchConfetti(150);
    } catch (error) {
      console.error(error);
      statusMessage.textContent = 'Não foi possível enviar agora. Verifique sua conexão e tente novamente.';
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = 'Confirmar presença';
    }
  });

  newResponseBtn.addEventListener('click', () => {
    form.reset();
    totalInput.value = 1;
    criancasInput.value = 0;
    nome.value = '';
    successEyebrow.textContent = 'Presença registrada';
    successTitle.textContent = 'Confirmação enviada!';
    successCard.hidden = true;
    rsvpCard.hidden = false;
    attendBtn.disabled = false;
    declineBtn.disabled = false;
    nextBtn.disabled = false;
    submitBtn.disabled = false;
    showStep(0);
    rsvpCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  syncState();
  showStep(0);

  const eventTime = new Date(config.eventDate || '2026-10-24T15:00:00-03:00').getTime();
  const countdownIds = ['days', 'hours', 'minutes', 'seconds'];
  function updateCountdown() {
    const distance = eventTime - Date.now();
    if (distance <= 0) { countdownIds.forEach(id => document.getElementById(id).textContent = '00'); return; }
    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  let pieces = [];
  let animationFrame = null;
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function launchConfetti(amount = 90) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const palette = ['#0b4aa0', '#68a9ef', '#e9a81b', '#ffd875', '#ffffff'];
    const centerX = innerWidth / 2;
    const centerY = Math.min(innerHeight * .42, 380);
    for (let i = 0; i < amount; i++) {
      pieces.push({x:centerX+(Math.random()-.5)*150,y:centerY+(Math.random()-.5)*35,vx:(Math.random()-.5)*10,vy:-Math.random()*9-4,gravity:.16+Math.random()*.08,drag:.991,size:5+Math.random()*7,rotate:Math.random()*Math.PI,spin:(Math.random()-.5)*.22,color:palette[Math.floor(Math.random()*palette.length)],life:0,maxLife:150+Math.random()*70});
    }
    if (!animationFrame) animateConfetti();
  }
  function animateConfetti() {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    pieces = pieces.filter(p => p.life < p.maxLife && p.y < innerHeight + 30);
    pieces.forEach(p => {p.life++;p.vx*=p.drag;p.vy+=p.gravity;p.x+=p.vx;p.y+=p.vy;p.rotate+=p.spin;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotate);ctx.globalAlpha=Math.max(0,1-p.life/p.maxLife);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.66);ctx.restore();});
    if (pieces.length) animationFrame=requestAnimationFrame(animateConfetti); else {animationFrame=null;ctx.clearRect(0,0,innerWidth,innerHeight);}
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setTimeout(() => launchConfetti(70), 450);
})();
