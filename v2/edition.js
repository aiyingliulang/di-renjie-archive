'use strict';
(() => {
  const D = window.ARCHIVE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const main = $('#main');
  const dialog = $('#dialog');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const person = id => D.people.find(p => p.id === (D.personAliases?.[id] || id));
  const caseBy = id => D.cases.find(c => c.id === id);
  const vol = id => D.volumes.find(v => v.id === id);

  let activeQuiz = 0;
  const quizAnswers = {};
  let searchScope = 'all';
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem('digong-v2-bookmarks') || '[]');
  } catch {}
  if (!Array.isArray(saved)) saved = [];
  saved = saved.filter(id => caseBy(id));

  const editionUrl = document.currentScript.src;
  const img = (path, alt, cls = '', eager = false) =>
    `<img src="${esc(new URL(path, editionUrl).href)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${cls ? ` class="${esc(cls)}"` : ''}>`;
  const external = (url, label) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const heading = (en, title, desc, badge = '') =>
    `<header class="page-head"><div><div class="overline">${en}</div><h1>${title}</h1></div><div class="page-head-side"><p>${desc}</p>${badge ? `<span class="head-stamp" aria-hidden="true">${badge}</span>` : ''}</div></header>`;
  const photoCaption = p =>
    `<figcaption class="photo-caption">${esc(p.label)} · ${external(p.source, '图片出处')}</figcaption>`;

  function syncBookmarkCount() {
    const btn = $('#bookmarks');
    if (btn) {
      btn.innerHTML = saved.length
        ? `阅卷簿 <b class="bookmark-count">${saved.length}</b>`
        : '阅卷簿';
    }
  }

  function tile(c, feature = false) {
    const v = vol(c.volume);
    const inBook = saved.includes(c.id);
    return `<a class="case-tile${feature ? ' featured' : ''}" href="#case/${c.id}">
      <div class="still-wrap">
        ${img(c.cover.path, c.title + '：' + c.cover.label)}
        <span class="case-number">卷${v.label} / ${String(D.cases.indexOf(c) + 1).padStart(2, '0')}</span>
        ${inBook ? '<span class="case-saved-flag">已入簿</span>' : ''}
      </div>
      <div class="tile-body">
        <div class="tile-meta">
          <span>${esc(v.title.replace('神探狄仁杰 ', ''))} · ${esc(c.place)}</span>
          <span>${c.range ? '第 ' + c.range + ' 集' : esc(c.scope)}</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <p class="tile-intro">${esc(c.lead)}</p>
        <div class="rule">
          <span>${c.people.length} 位案中人 · ${esc(c.tag)}</span>
          <span class="tile-cta">展开卷宗 →</span>
        </div>
      </div>
    </a>`;
  }

  function portrait(p, c) {
    const searchKey = [p.name, p.actor || '', p.role || ''].join(' ').toLowerCase();
    return `<a class="portrait-card" href="#person/${p.id}${c ? '?from=' + c.id : ''}" data-person-card data-person-search="${esc(searchKey)}">
      <div class="portrait-frame">
        ${p.photo
          ? img(p.photo, p.name + ' ' + (p.photoLabel || '原剧角色照'), p.photoFocus ? 'focus-' + p.id : '')
          : `<span class="no-photo" aria-label="暂无已核实的角色照"><b>${esc(p.sigil || p.name[0])}</b><small>角色照空缺</small></span>`}
      </div>
      <div class="portrait-body">
        ${p.caseAssociationStatus === 'pending' ? '<span class="portrait-pending">分案关联待核实</span>' : ''}
        <h3>${esc(p.name)}</h3>
        <p class="portrait-actor">${p.actor && p.actor !== '待核实' ? esc(p.actor) + ' 饰' : '演员待核实'}</p>
        <div class="role">${esc(p.role)}${c ? '' : ' · ' + p.cases.length + ' 案'}</div>
      </div>
    </a>`;
  }

  function renderQuizCard(qIdx, standalone = true) {
    const q = D.quizzes?.[qIdx];
    if (!q) return '';
    const c = caseBy(q.case);
    const v = c ? vol(c.volume) : null;
    const picked = quizAnswers[qIdx];
    const isCorrect = picked === q.correct;

    return `<div class="quiz-desk" data-quiz-desk="${qIdx}">
      ${standalone ? `<div class="quiz-tabs" role="tablist" aria-label="四部推演案卷">
        ${D.quizzes.map((item, idx) => {
          const itemCase = caseBy(item.case);
          const itemVol = itemCase ? vol(itemCase.volume) : null;
          return `<button type="button" class="${idx === qIdx ? 'active' : ''}" data-quiz-tab="${idx}" aria-pressed="${idx === qIdx}">
            <small>卷${itemVol ? itemVol.label : idx + 1}</small>
            <span>${esc(itemCase ? itemCase.title : '推演')}</span>
          </button>`;
        }).join('')}
      </div>` : ''}
      <div class="quiz-paper">
        <div class="quiz-paper-head">
          <div>
            <div class="overline">${v ? esc(v.title) + ' · ' : ''}${c ? esc(c.title) : ''}</div>
            <h3 class="lab-title">${esc(q.title)}</h3>
          </div>
          ${standalone && c ? `<a class="tag-link" href="#case/${c.id}">查阅本案全卷 →</a>` : ''}
        </div>
        <p class="lab-caption">${esc(q.intro)}</p>
        <div class="quiz-clues">
          ${q.clues.map(([label, text], i) => `<div class="quiz-clue-slip">
            <small>0${i + 1} / ${esc(label)}</small>
            <p>${esc(text)}</p>
          </div>`).join('')}
        </div>
        <p class="lab-question">${esc(q.question)}</p>
        <div class="lab-options">
          ${q.options.map((opt, oIdx) => {
            const selected = picked === oIdx;
            const stateAttr = selected ? ` data-correct="${oIdx === q.correct}"` : '';
            return `<button type="button" data-quiz-choice="${qIdx}:${oIdx}" aria-pressed="${selected}"${stateAttr}>
              <span class="opt-mark">${['甲', '乙', '丙'][oIdx] || oIdx + 1}</span>
              <span>${esc(opt)}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="lab-answer" role="status" aria-live="polite">
          ${picked !== undefined
            ? `<p class="${isCorrect ? 'ans-right' : 'ans-hint'}"><strong>${isCorrect ? '【堂断成立】' : '【再审疑点】'}</strong>${esc(isCorrect ? q.explain : q.hint)}</p>`
            : '<p class="ans-idle">点击甲、乙、丙任一推断，核验案头线索。</p>'}
        </div>
        <p class="photo-caption quiz-source">推演依据：${external(q.source, '对应分集视频与资料')}</p>
      </div>
    </div>`;
  }

  function home() {
    const totalEpisodes = D.volumes.reduce((sum, v) => sum + v.total, 0);
    return `
      <section class="cover">
        <div class="container">
          <div class="cover-inner">
            <div class="cover-copy">
              <div class="overline">THE DI RENJIE ARCHIVE / 2004—2010</div>
              <h1>明察秋毫<br>再入疑局</h1>
              <p class="intro">从幽州使团，到月氏王宫。<br>循四部十宗大案，重逢狄公与元芳，<br>在宣纸墨迹间复核每一个改变案情的人。</p>
              <div class="cover-actions">
                <a class="primary" href="#cases">翻开十案 <span aria-hidden="true">↗</span></a>
                <a class="secondary" href="#people/all">百八十八人名录</a>
              </div>
              <dl class="cover-metrics" aria-label="馆藏规模">
                <div><dt>正剧卷册</dt><dd>4 部 · ${totalEpisodes} 集</dd></div>
                <div><dt>主档疑案</dt><dd>${D.cases.length} 宗单元</dd></div>
                <div><dt>考据人物</dt><dd>${D.people.length} 份小传</dd></div>
              </dl>
            </div>
            <div class="hero-portraits">
              ${['di', 'yuanfang'].map(id => {
                const p = person(id);
                return `<figure>
                  ${img(p.photo || '', p.name, '', true)}
                  <figcaption>
                    <a class="hero-person-link" href="#person/${p.id}">${esc(p.name)}</a>
                    <small>${esc(p.actor)} 饰 · ${external(p.photoSource || p.source, '原剧角色照')}</small>
                  </figcaption>
                </figure>`;
              }).join('')}
            </div>
          </div>
          <div class="series-strip" aria-label="四部总目">
            ${D.volumes.map(v => {
              const vCases = D.cases.filter(c => c.volume === v.id);
              return `<a href="#cases/${v.id}">
                <b>${esc(v.label)}</b>
                <span>
                  <strong>${esc(v.title.replace('神探狄仁杰 ', ''))}</strong>
                  <small>${v.year} · ${v.total} 集 · ${vCases.length} 案</small>
                </span>
              </a>`;
            }).join('')}
          </div>
        </div>
      </section>

      <section class="section container">
        <div class="section-title">
          <div>
            <div class="overline">01 / THE CASE FILES</div>
            <h2>从一桩疑案开始</h2>
          </div>
          <a class="all-link" href="#cases">十案全览（共 10 卷）→</a>
        </div>
        <div class="cases-grid">
          ${[D.cases[0], D.cases[4], D.cases[1], D.cases[7], D.cases[8]].map((c, i) => tile(c, i === 0)).join('')}
        </div>
      </section>

      <section class="section deduction-section">
        <div class="container">
          <div class="section-title">
            <div>
              <div class="overline">02 / COURT DEDUCTION</div>
              <h2>与狄公同看一纸文书</h2>
            </div>
            <p>取自四部原剧的关键推理节点。对照三条已知消息，辨析哪一处破绽最先动摇全局。</p>
          </div>
          <div id="home-quiz-mount">${renderQuizCard(activeQuiz, true)}</div>
        </div>
      </section>

      <section class="section dark-section">
        <div class="container">
          <div class="section-title">
            <div>
              <div class="overline">03 / PEOPLE IN THE STORY</div>
              <h2>故人，各有来路</h2>
            </div>
            <p>人物归入案件，故事才有脉络。每篇人物正文均逾百字，关键身份与结局默认封存。<br><a href="#people/canal">翻阅《漕渠魅影》案中人 →</a> · <a href="#people/all">查看全册 ${D.people.length} 人 →</a></p>
          </div>
          <div class="portrait-grid">
            ${['jinghui', 'yingyu', 'huiwenzhong', 'xiaoqing', 'wuyuanmin'].map(id => portrait(person(id))).join('')}
          </div>
        </div>
      </section>`;
  }

  function cases(v = 'all') {
    const selectedVol = v !== 'all' ? vol(v) : null;
    const list = D.cases.filter(c => v === 'all' || c.volume === v);
    return `<div class="container section">
      ${heading(
        'THE CASE FILES',
        '四部 · 十案',
        '收录钱雁秋执导、梁冠华与张子健主演的三部《神探狄仁杰》与《神断狄仁杰》。按原剧单元归档，人物、现场与分集入口汇于一卷。',
        '拾案'
      )}
      <nav class="filters" aria-label="按部次筛选卷宗">
        <a class="${v === 'all' ? 'active' : ''}" href="#cases">全部卷宗（${D.cases.length}）</a>
        ${D.volumes.map(x => {
          const cnt = D.cases.filter(c => c.volume === x.id).length;
          return `<a class="${v === x.id ? 'active' : ''}" href="#cases/${x.id}">${esc(x.title)}（${cnt}）</a>`;
        }).join('')}
      </nav>
      ${selectedVol ? `<div class="volume-note-banner">
        <strong>${esc(selectedVol.title)}（${selectedVol.year} · 共 ${selectedVol.total} 集 · ${esc(selectedVol.platform)}）</strong>
        <span>${esc(selectedVol.note || '按全卷连续集数归档单元。')} · ${external(selectedVol.source, '正版剧集页')}</span>
      </div>` : ''}
      <div class="cases-grid">${list.map(c => tile(c)).join('')}</div>
    </div>`;
  }

  function detail(c) {
    const v = vol(c.volume);
    const idx = D.cases.indexOf(c);
    const prevCase = D.cases[(idx - 1 + D.cases.length) % D.cases.length];
    const nextCase = D.cases[(idx + 1) % D.cases.length];
    const caseQuizIndex = D.quizzes ? D.quizzes.findIndex(q => q.case === c.id) : -1;

    return `<div class="container section">
      <nav class="crumb" aria-label="面包屑">
        <a href="#cases">四部十案</a> / <a href="#cases/${c.volume}">${esc(v.title)}</a> / <span>第 ${idx + 1} 案</span>
      </nav>

      <div class="detail-top">
        <figure class="detail-figure">
          <div class="detail-image">${img(c.cover.path, c.cover.label, '', true)}</div>
          ${photoCaption(c.cover)}
        </figure>
        <div class="detail-summary">
          <div class="overline">CASE ${String(idx + 1).padStart(2, '0')} / ${esc(c.tag)}</div>
          <h1>${esc(c.title)}</h1>
          <p class="detail-meta-line">
            <span class="meta-badge">卷${esc(v.label)} · ${v.year}</span>
            <span>${esc(c.place)}</span>
            <span>·</span>
            <span>${c.range ? '第 ' + c.range + ' 集' : esc(c.scope)}</span>
          </p>
          <p class="lede">${esc(c.lead)}</p>
          <div class="detail-controls">
            <button type="button" data-scroll="cast">案中人 · ${c.people.length}</button>
            <button type="button" class="save-btn${saved.includes(c.id) ? ' is-saved' : ''}" data-save="${c.id}">${saved.includes(c.id) ? '已收入阅卷簿' : '收入阅卷簿 ＋'}</button>
            <button type="button" data-scroll="revisit">重访原剧 ↗</button>
          </div>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main-col">
          <section class="paper-section">
            <div class="paper-section-head">
              <span class="paper-num">壹</span>
              <h2>案起何处</h2>
            </div>
            <div class="clue-list">
              <div class="clue-slip">
                <small>01 / 起因</small>
                <h3>${esc(c.open[0])}</h3>
                <p>${esc(c.open[1])}</p>
              </div>
              <div class="clue-slip">
                <small>02 / 线索</small>
                <h3>${esc(c.thread[0])}</h3>
                <p>${esc(c.thread[1])}</p>
              </div>
            </div>
          </section>

          <section class="paper-section">
            <div class="paper-section-head">
              <span class="paper-num">贰</span>
              <h2>顺着案情走</h2>
            </div>
            <ol class="case-progress">
              ${c.progress.map((step, i) => `<li>
                <span class="step-no">0${i + 1}</span>
                <div>
                  <h3>${esc(step[0])}</h3>
                  <p>${esc(step[1])}</p>
                </div>
              </li>`).join('')}
            </ol>
          </section>

          ${caseQuizIndex >= 0 ? `<section class="paper-section case-inline-quiz">
            <div class="paper-section-head">
              <span class="paper-num">推</span>
              <h2>案头推演</h2>
            </div>
            <div id="case-quiz-mount">${renderQuizCard(caseQuizIndex, false)}</div>
          </section>` : ''}

          <section class="paper-section spoiler-paper">
            <details class="case-spoiler">
              <summary>
                <span class="seal-mini" aria-hidden="true">断</span>
                揭开案底
                <span>含关键剧情与真凶身份，点击展开</span>
              </summary>
              <div class="spoiler-content">
                <p>${esc(c.spoiler)}</p>
                <p class="photo-caption">${external(c.source || c.catalogSource, '核对剧情资料')}</p>
              </div>
            </details>
          </section>

          <section id="cast" class="cast-section">
            <div class="section-title">
              <div>
                <div class="overline">PEOPLE / THIS CASE</div>
                <h2>这一案，与谁有关</h2>
              </div>
              <a href="#people/${c.id}" class="all-link">在人物册中单独翻阅（${c.people.length} 人）→</a>
            </div>
            <div class="portrait-grid">${c.people.map(id => portrait(person(id), c)).join('')}</div>
          </section>

          <section class="frames-section">
            <div class="section-title">
              <div>
                <div class="overline">FRAMES / REVISIT</div>
                <h2>重见这一幕</h2>
              </div>
            </div>
            <p class="photo-caption">${c.gallery.length > 1 ? '原剧分集画面，点击放大查看出处。早期播出版缩略图保留原有清晰度。' : '此处为本案人物的原剧角色照；不将其他案件的画面混作现场。'}</p>
            <div class="case-gallery">
              ${c.gallery.map((p, i) => `<button type="button" data-photo="${c.id}:${i}" aria-label="查看${esc(p.label)}">
                <div class="gallery-thumb">${img(p.path, p.label)}</div>
                <span>${esc(p.label)} ↗</span>
              </button>`).join('')}
            </div>
          </section>

          <section id="revisit" class="paper-section">
            <div class="paper-section-head">
              <span class="paper-num">叁</span>
              <h2>回到原剧</h2>
            </div>
            <p>${esc(v.note || '以下入口前往原平台，本站不提供视频播放。')}</p>
            <div class="episode-pills">
              ${c.episodeRange
                ? Array.from({ length: c.episodeRange[1] - c.episodeRange[0] + 1 }, (_, i) => i + c.episodeRange[0])
                    .map(n => external(window.EPISODES[c.volume][n - 1], `第 ${n} 集`)).join('')
                : external(v.source, '打开《神断狄仁杰》剧集页')}
            </div>
          </section>
        </div>

        <aside class="side-note" aria-label="卷内索引">
          <h3>卷内索引</h3>
          <a href="#people/${c.id}">案中人物名录 · ${c.people.length} 位</a>
          <button type="button" class="side-scroll-btn" data-scroll="revisit">分集与观剧入口</button>
          <a href="#case/${prevCase.id}">← 上一卷：${esc(prevCase.title)}</a>
          <a href="#case/${nextCase.id}">下一卷：${esc(nextCase.title)} →</a>
          <p>角色介绍默认保留谜面。关键身份和结局收在“揭开案底”及人物页折叠栏中。</p>
          <div class="side-ext">${external(c.catalogSource, '本卷演职员资料')}</div>
        </aside>
      </div>
    </div>`;
  }

  function people(id = 'envoy') {
    const isAll = id === 'all';
    const c = isAll ? null : (caseBy(id) || D.cases[0]);
    const activeId = isAll ? 'all' : c.id;
    const list = c ? c.people.map(person) : D.people;
    const withPhotoCount = list.filter(p => p.photo).length;

    return `<div class="container section">
      ${heading(
        'THE PEOPLE INDEX',
        '案中人',
        '主角之外，每个证人、故人和对手都有自己的来路。选择一桩案查看涉案人物，或在全册百八十八人中即时检索。',
        '名录'
      )}

      <div class="case-quick-pills" aria-label="按案件切换人物">
        <a class="${isAll ? 'active' : ''}" href="#people/all">全册总目（${D.people.length}）</a>
        ${D.cases.map(x => `<a class="${activeId === x.id ? 'active' : ''}" href="#people/${x.id}">${esc(x.title)}（${x.people.length}）</a>`).join('')}
      </div>

      <div class="people-intro">
        <div class="people-select-group">
          <label for="case-select">正在翻阅</label>
          <select id="case-select">
            ${D.cases.map(x => `<option value="${x.id}" ${activeId === x.id ? 'selected' : ''}>卷${vol(x.volume).label} · ${esc(x.title)}（${x.people.length}人）</option>`).join('')}
            <option value="all" ${isAll ? 'selected' : ''}>全册人物（${D.people.length}人）</option>
          </select>
        </div>
        <div class="people-inline-search">
          <label class="sr-only" for="people-filter">在本页筛选姓名、演员或身份</label>
          <input id="people-filter" type="search" placeholder="筛选本页人物、演员或职司…" autocomplete="off">
        </div>
        <p class="people-summary" id="people-summary" data-base-count="${list.length}">
          ${c
            ? `《${esc(c.title)}》共 ${list.length} 位人物（${withPhotoCount} 人附原剧照） · <a href="#case/${c.id}">返回本案卷宗 →</a>`
            : `全册 ${D.people.length} 位人物（${withPhotoCount} 人附原剧照），按主要登场顺序编排。`}
        </p>
      </div>

      <div class="portrait-grid" id="people-portrait-grid">${list.map(p => portrait(p, c)).join('')}</div>
      <p class="empty" id="people-filter-empty" hidden>当前筛选词在本页没有匹配人物，请清空筛选框或点击顶部「检索」搜寻全馆。</p>
      <p class="photo-caption" style="margin-top:28px">部分人物使用原剧相关场景画面；点击人物可查看考据小传与图片出处。</p>
    </div>`;
  }

  function character(p, from) {
    const back = caseBy(from) ? from : p.cases[0];
    const backCase = caseBy(back);
    const siblings = backCase ? backCase.people.map(person).filter(Boolean) : D.people;
    const pos = siblings.findIndex(item => item.id === p.id);
    const prevP = pos > 0 ? siblings[pos - 1] : null;
    const nextP = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : null;
    const credit = p.photo ? external(p.photoSource, (p.photoLabel || '原剧角色照') + '出处') : '';

    return `<div class="container section">
      <nav class="crumb" aria-label="面包屑">
        <a href="#people/${back}">案中人${backCase ? ' · ' + esc(backCase.title) : ''}</a> / <span>${esc(p.name)}</span>
      </nav>

      <div class="character-layout">
        <figure class="character-portrait-box">
          <div class="character-frame">
            ${p.photo
              ? img(p.photo, p.name, '', true)
              : `<div class="portrait-frame"><span class="no-photo"><b>${esc(p.sigil || p.name[0])}</b><small>角色照暂缺</small></span></div>`}
          </div>
          ${credit ? `<figcaption class="photo-caption">${credit}</figcaption>` : '<figcaption class="photo-caption">尚未找到可确认出处的单人原剧画面，保留空缺不配代图。</figcaption>'}
        </figure>

        <div class="character-dossier">
          <div class="overline">CHARACTER DOSSIER / ${esc(p.role)}</div>
          <h1>${esc(p.name)}</h1>

          <dl class="character-meta-strip">
            <div><dt>饰演演员</dt><dd>${p.actor ? esc(p.actor) + (p.actor === '待核实' ? '' : ' 饰') : '待核实'}</dd></div>
            <div><dt>公开身份</dt><dd>${esc(p.role)}</dd></div>
            <div><dt>关联卷宗</dt><dd>共 ${p.cases.length} 案</dd></div>
          </dl>

          <div class="character-bio-paper">
            <p>${esc(p.text)}</p>
          </div>

          ${p.spoiler ? `<details class="person-spoiler paper-section">
            <summary>
              <span class="seal-mini" aria-hidden="true">密</span>
              身份与关键行动
              <span>含剧透，点击展开</span>
            </summary>
            <p>${esc(p.spoiler)}</p>
            <p class="faction"><strong>阵营与关系：</strong>${esc(p.faction)}</p>
          </details>` : ''}

          <h2>他／她在哪些案中</h2>
          ${p.caseAssociationStatus === 'pending' ? '<p class="review-note">以下为所在剧情段的暂定定位，具体分案出场仍待核实。</p>' : ''}
          <div class="related-cases">
            ${p.cases.map(cid => {
              const c = caseBy(cid);
              return `<a href="#case/${cid}">
                ${img(c.cover.path, c.title)}
                <span>
                  <strong>${esc(c.title)}</strong>
                  <small>${esc(vol(c.volume).title)} · ${c.range ? '第 ' + c.range + ' 集' : esc(c.scope)}</small>
                </span>
              </a>`;
            }).join('')}
          </div>

          ${p.reviewNote ? `<p class="review-note"><strong>校勘说明：</strong>${esc(p.reviewNote)}</p>` : ''}

          <div class="photo-caption person-sources">
            <p>演职员与剧情考据资料${p.reviewedOn ? ' · 核对日期 ' + esc(p.reviewedOn) : ''}</p>
            <div>${(p.reviewSources || [p.source]).map((url, i) => external(url, '参考来源 ' + (i + 1))).join(' · ')}</div>
          </div>

          ${(prevP || nextP) ? `<nav class="character-pager" aria-label="同卷相邻人物">
            ${prevP ? `<a href="#person/${prevP.id}?from=${back}"><small>← 同案上一位</small><strong>${esc(prevP.name)}</strong></a>` : '<span></span>'}
            ${nextP ? `<a class="next" href="#person/${nextP.id}?from=${back}"><small>同案下一位 →</small><strong>${esc(nextP.name)}</strong></a>` : '<span></span>'}
          </nav>` : ''}
        </div>
      </div>
    </div>`;
  }

  function sources() {
    return `<div class="container section">
      ${heading(
        'ABOUT THE ARCHIVE',
        '资料与版本',
        '只收录钱雁秋参与执导、梁冠华与张子健搭档主演的四部作品。本站为非官方观剧考据整理。',
        '考据'
      )}
      <div class="source-list">
        <article class="paper-section">
          <h2>四部作品的边界</h2>
          <p>收录《神探狄仁杰》第一、二、三部，以及《神断狄仁杰》。不混入其他主创版本；不同部次由不同演员出演的同一人物，在条目中分别注明。</p>
        </article>
        <div class="source-volumes-grid">
          ${D.volumes.map(v => `<article class="paper-section">
            <div class="overline">卷${esc(v.label)} · ${v.year} · ${esc(v.platform)}</div>
            <h2>${esc(v.title)} · ${v.total} 集</h2>
            <p>${esc(v.note || '按播出版集数建立索引。')}</p>
            <p class="source-card-links">${external(v.source, '剧集正版平台')} · ${external(D.sources[v.id], '演职员参考资料')}</p>
          </article>`).join('')}
        </div>
        <article class="paper-section">
          <h2>画面与文字校勘准则</h2>
          <p>分集画面来自央视网对应播放页；已确认出处的角色照附具体人物／剧集资料；无法核实人物或出处的图片保留空位，查找结果记录在仓库的内容审校文件中。权益归原权利人。图片用于辨识原剧人物和回顾剧情，未作 AI 换脸或伪造剧照。网络资料存在错字，本站对人物名称及演员名交叉核对；未核实的角色照保留空缺。</p>
        </article>
        <article class="paper-section">
          <h2>如何阅读本案牍</h2>
          <p>十个单元按主要叙事线归档。《神断狄仁杰》两段故事前后相扣，不强行划出互不相干的分集边界。人物册按案件筛选，人物档案反向链接相关案件。全册 ${D.people.length} 位人物，简介正文均不少于一百字；资料仍有分歧的字段随档案注明，不猜填。“揭开案底”和人物页“身份与关键行动”包含关键剧透，默认折叠；阅卷簿仅保存在本机浏览器。</p>
        </article>
      </div>
    </div>`;
  }

  function bindInlinePeopleFilter() {
    const input = $('#people-filter');
    if (!input) return;
    const cards = $$('[data-person-card]');
    const emptyEl = $('#people-filter-empty');
    input.addEventListener('input', () => {
      const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const card of cards) {
        const ok = !terms.length || terms.every(t => card.dataset.personSearch.includes(t));
        card.hidden = !ok;
        if (ok) visible++;
      }
      if (emptyEl) emptyEl.hidden = visible > 0;
    });
  }

  function render() {
    if (location.hash === '#main' && main.children.length) {
      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: 'start' });
      return;
    }
    if (location.hash === '#home') {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
    const [path, query = ''] = location.hash.slice(1).split('?');
    const [route, id] = path.split('/');
    if (dialog.open) dialog.close();

    main.innerHTML =
      route === 'cases' ? cases(id) :
      route === 'case' && caseBy(id) ? detail(caseBy(id)) :
      route === 'people' ? people(id) :
      route === 'person' && person(id) ? character(person(id), new URLSearchParams(query).get('from')) :
      route === 'sources' ? sources() :
      home();

    const activeNav = route === 'case' ? 'cases' : route === 'person' ? 'people' : (route || 'home');
    $$('nav a').forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + activeNav)));

    document.title = (
      route === 'case' && caseBy(id) ? caseBy(id).title :
      route === 'person' && person(id) ? person(id).name :
      route === 'cases' ? '四部十案' :
      route === 'people' ? '案中人名录' :
      route === 'sources' ? '资料与版本' :
      '四部十案，故人重逢'
    ) + ' · 狄公案牍';

    syncBookmarkCount();
    bindInlinePeopleFilter();
    window.scrollTo(0, 0);
  }

  function open(title, html) {
    $('#dialog-title').textContent = title;
    $('#dialog-content').innerHTML = html;
    if (!dialog.open) dialog.showModal();
  }

  let toastTimer;
  function notify(text) {
    clearTimeout(toastTimer);
    $('#status').textContent = text;
    toastTimer = setTimeout(() => { $('#status').textContent = ''; }, 2400);
  }

  function results(q) {
    const raw = q.trim().toLowerCase();
    const terms = raw.split(/\s+/).filter(Boolean);
    const matchAll = hay => !terms.length || terms.every(t => hay.includes(t));

    const cs = searchScope === 'people' ? [] : D.cases.filter(c =>
      matchAll([c.title, c.keys, c.place, c.tag].join(' ').toLowerCase())
    );
    const ps = (!raw || searchScope === 'cases') ? [] : D.people.filter(p =>
      matchAll([p.name, p.actor, p.role, p.keys, p.text].join(' ').toLowerCase())
    );

    const caseHtml = cs.map(c => `<a class="search-result" href="#case/${c.id}">
      ${img(c.cover.path, c.title)}
      <span>
        <strong>${esc(c.title)}</strong>
        <small>卷${esc(vol(c.volume).label)} · ${esc(c.place)} · ${c.people.length} 位案中人</small>
      </span>
    </a>`).join('');

    const peopleHtml = ps.slice(0, 60).map(p => `<a class="search-result" href="#person/${p.id}">
      ${p.photo ? img(p.photo, p.name) : `<span class="search-sigil">${esc(p.sigil || p.name[0])}</span>`}
      <span>
        <strong>${esc(p.name)}</strong>
        <small>${esc(p.actor)} · ${esc(p.role)} · ${p.cases.map(cid => caseBy(cid).title).join(' / ')}</small>
      </span>
    </a>`).join('');

    return (caseHtml + peopleHtml) || '<p class="empty">没有找到相应条目，试试人名、曾用名、案名、地名或演员名。</p>';
  }

  function openSearchModal() {
    searchScope = 'all';
    open('检索案牍', `
      <div class="search-modal-controls">
        <input id="query" type="search" placeholder="输入案名、人物、别称、演员或地名…" aria-label="检索内容" autocomplete="off">
        <div class="search-scope-tabs" role="group" aria-label="检索范围">
          <button type="button" data-search-scope="all" aria-pressed="true">全部</button>
          <button type="button" data-search-scope="cases" aria-pressed="false">卷宗</button>
          <button type="button" data-search-scope="people" aria-pressed="false">人物</button>
        </div>
      </div>
      <div id="results">${results('')}</div>
    `);
    const qInput = $('#query');
    qInput.focus();
    qInput.oninput = e => { $('#results').innerHTML = results(e.target.value); };
  }

  function renderBookmarksModal() {
    const valid = saved.map(id => caseBy(id)).filter(Boolean);
    open('我的阅卷簿', valid.length
      ? `<div class="bookmarks-list">
          ${valid.map(c => `<div class="bookmark-row">
            <a class="search-result" href="#case/${c.id}">
              ${img(c.cover.path, c.title)}
              <span>
                <strong>${esc(c.title)}</strong>
                <small>${esc(vol(c.volume).title)} · ${esc(c.place)}</small>
              </span>
            </a>
            <button type="button" class="unsave-btn" data-unsave="${c.id}" aria-label="从阅卷簿移出${esc(c.title)}">移出</button>
          </div>`).join('')}
        </div>`
      : '<p class="empty">还没有收入卷宗。打开任一案件，点击“收入阅卷簿 ＋”即可在本机浏览器留存入口。</p>'
    );
  }

  function openGalleryPhoto(caseId, index) {
    const c = caseBy(caseId);
    if (!c || !c.gallery[index]) return;
    const p = c.gallery[index];
    const total = c.gallery.length;
    const prevIdx = (index - 1 + total) % total;
    const nextIdx = (index + 1) % total;
    open(`${c.title} · 画面 ${index + 1}/${total}`, `
      <div class="lightbox-wrap">
        ${img(p.path, p.label, 'gallery-lightbox', true)}
        ${photoCaption(p)}
        ${total > 1 ? `<div class="lightbox-nav">
          <button type="button" data-photo="${c.id}:${prevIdx}">← 上一幕</button>
          <span>${index + 1} / ${total}</span>
          <button type="button" data-photo="${c.id}:${nextIdx}">下一幕 →</button>
        </div>` : ''}
      </div>
    `);
  }

  $('#search').onclick = openSearchModal;
  $('#sponsor').onclick = () => open('请艾影流浪喝杯茶', `
    <div class="sponsor-content">
      <p>自愿赞赏，量力而行，心意同样珍贵。</p>
      ${img('../assets/wechat-sponsor-qr.jpg', '艾影流浪的微信收款码', 'sponsor-qr', true)}
      <small>收款账号 · 艾影流浪</small>
    </div>
  `);
  $('#bookmarks').onclick = renderBookmarksModal;
  $('#close').onclick = () => dialog.close();

  dialog.addEventListener('click', e => {
    if (e.target === dialog) dialog.close();
    if (e.target.closest('a[href^="#"]')) dialog.close();
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('button,[data-scroll]');
    if (!b) return;

    if (b.dataset.scroll) {
      e.preventDefault();
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    if (b.dataset.save) {
      const id = b.dataset.save;
      if (saved.includes(id)) {
        notify('这份卷宗已经收入阅卷簿');
        return;
      }
      saved.push(id);
      try {
        localStorage.setItem('digong-v2-bookmarks', JSON.stringify(saved));
        notify('已收入本机阅卷簿');
      } catch {
        notify('已暂存；浏览器未允许持久保存');
      }
      b.textContent = '已收入阅卷簿';
      b.classList.add('is-saved');
      syncBookmarkCount();
    }

    if (b.dataset.unsave) {
      const id = b.dataset.unsave;
      saved = saved.filter(item => item !== id);
      try { localStorage.setItem('digong-v2-bookmarks', JSON.stringify(saved)); } catch {}
      syncBookmarkCount();
      const pageSaveBtn = $(`[data-save="${id}"]`);
      if (pageSaveBtn) {
        pageSaveBtn.textContent = '收入阅卷簿 ＋';
        pageSaveBtn.classList.remove('is-saved');
      }
      renderBookmarksModal();
      notify('已从阅卷簿移出');
    }

    if (b.dataset.photo) {
      const [cid, n] = b.dataset.photo.split(':');
      openGalleryPhoto(cid, +n);
    }

    if (b.dataset.quizTab !== undefined) {
      activeQuiz = Number(b.dataset.quizTab);
      const mount = $('#home-quiz-mount');
      if (mount) mount.innerHTML = renderQuizCard(activeQuiz, true);
    }

    if (b.dataset.quizChoice) {
      const [qIdx, oIdx] = b.dataset.quizChoice.split(':').map(Number);
      quizAnswers[qIdx] = oIdx;
      const homeMount = $('#home-quiz-mount');
      if (homeMount) homeMount.innerHTML = renderQuizCard(activeQuiz, true);
      const caseMount = $('#case-quiz-mount');
      if (caseMount) caseMount.innerHTML = renderQuizCard(qIdx, false);
    }

    if (b.dataset.searchScope) {
      searchScope = b.dataset.searchScope;
      $$('[data-search-scope]', dialog).forEach(btn =>
        btn.setAttribute('aria-pressed', String(btn.dataset.searchScope === searchScope))
      );
      const qInput = $('#query');
      if (qInput) $('#results').innerHTML = results(qInput.value);
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'case-select') {
      location.hash = 'people/' + e.target.value;
    }
  });

  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !dialog.open) {
      e.preventDefault();
      openSearchModal();
    }
  });

  $('.skip').addEventListener('click', e => {
    e.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  });

  window.addEventListener('hashchange', render);
  render();
})();
