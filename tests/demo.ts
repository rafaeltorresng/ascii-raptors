import axe from 'axe-core';
const runButton = document.getElementById('run') as HTMLButtonElement;
const save = document.getElementById('save') as HTMLButtonElement;
const output = document.getElementById('result')!;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const checksum = (canvas: HTMLCanvasElement) => {
  let h = 2166136261;
  for (const v of canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data)
    h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
};
save.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([output.textContent!], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ascii-raptors-demo-audit.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  save.disabled = true;
  document.getElementById('results')!.replaceChildren();
  const savedTheme = localStorage.getItem('ascii-raptors-theme'),
    savedPause = sessionStorage.getItem('ascii-raptors-paused');
  const results: { name: string; ok: boolean; detail: string }[] = [],
    audits: unknown[] = [];
  const frame = document.createElement('iframe');
  frame.title = 'Demo em validação';
  frame.style.width = '960px';
  frame.style.height = '800px';
  document.body.append(frame);
  let doc: Document;
  const load = async (path: string) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Page load timeout')), 15000);
      frame.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      frame.src = new URL(path, location.href).href;
    });
    doc = frame.contentDocument!;
    await delay(120);
  };
  const click = (selector: string) => {
    const node = doc.querySelector<HTMLElement>(selector);
    assert(node, `Missing ${selector}`);
    node!.click();
  };
  async function run(name: string, fn: () => Promise<string>) {
    const li = document.createElement('li');
    li.textContent = `Executando: ${name}`;
    document.getElementById('results')!.append(li);
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail });
      li.textContent = `PASS · ${name} — ${detail}`;
      li.className = 'pass';
    } catch (error) {
      const detail = String(error);
      results.push({ name, ok: false, detail });
      li.textContent = `FAIL · ${name} — ${detail}`;
      li.className = 'fail';
    }
  }
  try {
    sessionStorage.removeItem('ascii-raptors-paused');
    localStorage.setItem('ascii-raptors-theme', 'dark');
    await run('Coleção: céu em tela cheia e pausa persistente até o estudo', async () => {
      await load('../index.html');
      assert(!doc.querySelector('.bird-index'), 'Study index still on the sky');
      assert(!doc.querySelector('footer'), 'Footer still on the sky');
      assert(!doc.querySelector('.sky-title'), 'Title still on the sky');
      const canvas = doc.getElementById('sky') as HTMLCanvasElement;
      assert(canvas.width > 0, 'Canvas not sized');
      assert(canvas.getBoundingClientRect().height > 700, 'Sky is not full viewport');
      if (doc.getElementById('sky-play')!.getAttribute('aria-label') === 'Pausar voo')
        click('#sky-play');
      const paused = checksum(canvas);
      doc.getElementById('theme')!.focus();
      await delay(180);
      assert(checksum(canvas) === paused, 'Pause depends on focus');
      assert(sessionStorage.getItem('ascii-raptors-paused') === 'true', 'Pause was not persisted');
      await load('../study.html?species=golden-eagle');
      assert(doc.title.includes('Águia-real'), 'Wrong initial species');
      assert(
        doc.getElementById('play')!.getAttribute('aria-label') === 'Reproduzir animação',
        'Navigation restarted motion',
      );
      return 'céu sem texto; pausa preservada ao abrir o estudo';
    });
    await run(
      'Estudos: modos e seleção preservam a pausa; links, descrições e tempo coerentes',
      async () => {
        const canvas = doc.getElementById('raptor') as HTMLCanvasElement;
        click('input[name=flight][value=flap]');
        assert(
          doc.getElementById('play')!.getAttribute('aria-label') === 'Reproduzir animação',
          'Mode started playback',
        );
        const still = checksum(canvas);
        await delay(160);
        assert(checksum(canvas) === still, 'Mode did not remain paused');
        for (const id of ['peregrine-falcon', 'swallow-tailed-kite', 'golden-eagle']) {
          click(`input[name=species][value=${id}]`);
          assert(
            doc.getElementById('play')!.getAttribute('aria-label') === 'Reproduzir animação',
            'Species restarted playback',
          );
          assert(
            (doc.querySelector('input[name=species]:checked') as HTMLInputElement).value === id,
            'Selection mismatch',
          );
          assert(
            (doc.getElementById('raptor')!.getAttribute('aria-label') ?? '').length > 40,
            'Missing description',
          );
        }
        click('.pose-card');
        assert(
          (doc.getElementById('time') as HTMLInputElement).value === '2',
          'Time slider disagrees with pose',
        );
        assert(
          doc.getElementById('time-label')!.getAttribute('aria-live') === 'off',
          'Time output is noisy',
        );
        return 'trocas não autorizam movimento; pose, descrição e estado nativo consistentes';
      },
    );
    await run('Responsividade e axe-core: coleção e três estudos nos dois temas', async () => {
      let cases = 0;
      for (const width of [320, 390, 960, 1440])
        for (const theme of ['dark', 'light'])
          for (const path of [
            '../index.html',
            '../study.html?species=swallow-tailed-kite',
            '../study.html?species=golden-eagle',
            '../study.html?species=peregrine-falcon',
          ]) {
            frame.style.width = `${width}px`;
            frame.style.height = width < 700 ? '844px' : '900px';
            localStorage.setItem('ascii-raptors-theme', theme);
            await load(path);
            assert(
              doc.documentElement.scrollWidth <= width,
              `${path}/${width}: horizontal overflow`,
            );
            assert(doc.querySelectorAll('h1').length === 1, 'Expected one h1');
            assert(doc.querySelectorAll('main').length === 1, 'Expected main landmark');
            if (width === 320 || width === 960) {
              const script = doc.createElement('script');
              script.textContent = axe.source;
              doc.head.append(script);
              const child = frame.contentWindow as Window & { axe: typeof axe };
              const audit = await child.axe.run(doc, {
                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
              });
              audits.push({
                path,
                width,
                theme,
                violations: audit.violations,
                incomplete: audit.incomplete.map((i) => ({
                  id: i.id,
                  impact: i.impact,
                  nodes: i.nodes.map((n) => ({
                    target: n.target,
                    failureSummary: n.failureSummary,
                  })),
                })),
                passes: audit.passes.length,
              });
              assert(
                audit.violations.length === 0,
                `${path}/${width}/${theme}: ${audit.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(',')).join('; ')}`,
              );
            }
            cases++;
          }
      return `${cases} layouts sem overflow; 16 auditorias axe WCAG A/AA`;
    });
    await run('Fallback sem Canvas informa o erro e não oferece reprodução', async () => {
      const html = await (await fetch('../index.html')).text();
      await new Promise<void>((resolve) => {
        frame.onload = () => resolve();
        frame.srcdoc = html.replace(
          '<head>',
          '<head><base href="' +
            new URL('../', location.href).href +
            '"><script>HTMLCanvasElement.prototype.getContext=function(){return null}</script>',
        );
      });
      await delay(180);
      doc = frame.contentDocument!;
      assert(!doc.getElementById('error-note')!.hidden, 'Missing fallback');
      assert(
        (doc.getElementById('sky-play') as HTMLButtonElement).disabled,
        'Unavailable play enabled',
      );
      assert(!doc.querySelector('.sky-title'), 'Title returned in the fallback');
      return 'mensagem visível e reprodução indisponível';
    });
  } finally {
    frame.remove();
    if (savedTheme === null) localStorage.removeItem('ascii-raptors-theme');
    else localStorage.setItem('ascii-raptors-theme', savedTheme);
    if (savedPause === null) sessionStorage.removeItem('ascii-raptors-paused');
    else sessionStorage.setItem('ascii-raptors-paused', savedPause);
    output.textContent = JSON.stringify(
      {
        date: new Date().toISOString(),
        userAgent: navigator.userAgent,
        dpr: devicePixelRatio,
        axeVersion: axe.version,
        passed: results.filter((r) => r.ok).length,
        total: results.length,
        results,
        audits,
      },
      null,
      2,
    );
    runButton.disabled = false;
    save.disabled = false;
    if (new URL(location.href).searchParams.get('save') === '1') save.click();
  }
});
if (new URL(location.href).searchParams.get('run') === '1') runButton.click();
