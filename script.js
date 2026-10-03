(() => {
  const $ = (id) => document.getElementById(id);

  const screens = {
    setup: $('setupScreen'),
    game: $('gameScreen'),
    end: $('endScreen')
  };

  const els = {
    startBtn: $('startBtn'),
    restartBtn: $('restartBtn'),
    playAgainBtn: $('playAgainBtn'),

    inningLabel: $('inningLabel'),
    outLabel: $('outLabel'),
    p1Name: $('p1Name'),
    p2Name: $('p2Name'),
    p1Score: $('p1Score'),
    p2Score: $('p2Score'),
    offenseName: $('offenseName'),
    defenseName: $('defenseName'),

    runner1: $('runner1'),
    runner2: $('runner2'),
    runner3: $('runner3'),
    baseText: $('baseText'),
    scoreHistory: $('scoreHistory'),
    extraHistoryLabel: $('extraHistoryLabel'),

    handoffPhase: $('handoffPhase'),
    handoffTitle: $('handoffTitle'),
    handoffText: $('handoffText'),
    handoffReadyBtn: $('handoffReadyBtn'),

    phaseBackdrop: $('phaseBackdrop'),
    defenseRoleText: $('defenseRoleText'),
    attackRoleText: $('attackRoleText'),

    defensePhase: $('defensePhase'),
    defenseSpots: [...document.querySelectorAll('.defense-spot')],
    lockDefenseBtn: $('lockDefenseBtn'),

    attackPhase: $('attackPhase'),
    attackGuide: $('attackGuide'),
    attackSpots: [...document.querySelectorAll('.attack-spot')],

    resultPhase: $('resultPhase'),
    resultTitle: $('resultTitle'),
    resultText: $('resultText'),
    resultDetail: $('resultDetail'),
    resultNextBtn: $('resultNextBtn'),

    winnerTitle: $('winnerTitle'),
    finalScore: $('finalScore'),
    winnerMessage: $('winnerMessage')
  };

  const hitLabels = {
    1: '1塁打',
    2: '2塁打',
    3: '3塁打',
    4: 'ホームラン'
  };

  const spotLabels = {
    1: '1塁',
    2: '2塁',
    3: '3塁',
    4: 'ホーム'
  };

  const state = {
    players: ['プレイヤー1', 'プレイヤー2'],
    scores: [0, 0],
    inning: 1,
    half: 'top',
    extra: false,
    outs: 0,
    bases: [false, false, false], // 1B, 2B, 3B
    hitSpot: null,
    selectedDefenseSpot: null,
    revealedOuts: new Set(),
    handoffTarget: null,
    afterResultAction: null,
    inningScores: [
      { top: null, bottom: null },
      { top: null, bottom: null },
      { top: null, bottom: null }
    ],
    extraScores: []
  };

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideAllPhases() {
    [
      els.handoffPhase,
      els.defensePhase,
      els.attackPhase,
      els.resultPhase
    ].forEach((node) => node.classList.add('hidden'));
  }

  function cleanName(value, fallback) {
    return value.trim() || fallback;
  }

  function offenseIndex() {
    return state.half === 'top' ? 0 : 1;
  }

  function defenseIndex() {
    return state.half === 'top' ? 1 : 0;
  }

  function inningLabelText() {
    return state.extra
      ? `延長${state.inning - 3}回 ${state.half === 'top' ? '表' : '裏'}`
      : `${state.inning}回 ${state.half === 'top' ? '表' : '裏'}`;
  }

  function resetBases(extraRunner = false) {
    state.bases = extraRunner ? [false, true, false] : [false, false, false];
  }

  function resetPitchSequence() {
    state.hitSpot = null;
    state.selectedDefenseSpot = null;
    state.revealedOuts = new Set();
    clearSpotVisuals();
  }

  function startHalfInning(defenseAlreadyHasDevice = false) {
    state.outs = 0;
    resetBases(state.extra);
    resetPitchSequence();
    updateAll();

    if (defenseAlreadyHasDevice) {
      showDefense();
      return;
    }

    prepareHandoff(
      'defense',
      `${state.players[defenseIndex()]}へ`,
      '攻撃側に見られないよう、ヒットの位置を決めてください。'
    );
  }
  function prepareHandoff(target, title, text) {
    state.handoffTarget = target;
    hideAllPhases();
    setRoleBackdrop(null, '');
    els.handoffPhase.classList.remove('hidden');
    els.handoffTitle.textContent = title;
    els.handoffText.textContent = text;
  }

  function setRoleBackdrop(mode, playerName) {
    if (!els.phaseBackdrop) return;

    const attackScene = els.phaseBackdrop.querySelector('.attack-scene');
    const defenseScene = els.phaseBackdrop.querySelector('.defense-scene');

    if (!mode) {
      els.phaseBackdrop.classList.add('hidden');
      els.phaseBackdrop.classList.remove('attack', 'defense');
      if (attackScene) attackScene.classList.add('hidden');
      if (defenseScene) defenseScene.classList.add('hidden');
      return;
    }

    const isAttack = mode === 'attack';
    els.phaseBackdrop.classList.remove('hidden');
    els.phaseBackdrop.classList.toggle('attack', isAttack);
    els.phaseBackdrop.classList.toggle('defense', !isAttack);
    if (attackScene) attackScene.classList.toggle('hidden', !isAttack);
    if (defenseScene) defenseScene.classList.toggle('hidden', isAttack);
  }

  function enterHandoffTarget() {
    if (state.handoffTarget === 'defense') {
      showDefense();
    } else if (state.handoffTarget === 'attack') {
      showAttack();
    } else if (state.handoffTarget === 'nextHalf') {
      advanceHalfInning();
    }
  }

  function showDefense() {
    hideAllPhases();
    els.defensePhase.classList.remove('hidden');
    setRoleBackdrop('defense', state.players[defenseIndex()]);
    els.defenseRoleText.textContent = `${state.players[defenseIndex()]}が守備`;
    state.selectedDefenseSpot = null;
    els.lockDefenseBtn.disabled = true;

    els.defenseSpots.forEach((button) => {
      button.classList.remove('selected');
      button.disabled = false;
    });
  }

  function selectDefenseSpot(spot) {
    state.selectedDefenseSpot = spot;
    els.defenseSpots.forEach((button) => {
      button.classList.toggle('selected', Number(button.dataset.spot) === spot);
    });
    els.lockDefenseBtn.disabled = false;
  }

  function lockDefense() {
    if (!state.selectedDefenseSpot) return;

    state.hitSpot = state.selectedDefenseSpot;
    prepareHandoff(
      'attack',
      `${state.players[offenseIndex()]}へ`,
      '守備の配置は隠しました。ヒットを当ててください。'
    );
  }

  function clearSpotVisuals() {
    els.attackSpots.forEach((button) => {
      button.disabled = false;
      button.classList.remove('revealed-out', 'revealed-hit');
      button.querySelector('b').textContent = '?';
    });
  }

  function showAttack() {
    hideAllPhases();
    els.attackPhase.classList.remove('hidden');
    setRoleBackdrop('attack', state.players[offenseIndex()]);
    els.attackRoleText.textContent = `${state.players[offenseIndex()]}が攻撃`;
    els.attackGuide.textContent = state.revealedOuts.size
      ? `アウトが${state.revealedOuts.size}つ判明。残った場所から選んでください。`
      : '4か所のうち1つを選んでください。';

    els.attackSpots.forEach((button) => {
      const spot = Number(button.dataset.spot);
      const isOut = state.revealedOuts.has(spot);
      button.disabled = isOut;
      if (isOut) {
        button.classList.add('revealed-out');
        button.querySelector('b').textContent = '×';
      } else {
        button.classList.remove('revealed-out', 'revealed-hit');
        button.querySelector('b').textContent = '?';
      }
    });
  }

  function chooseAttackSpot(spot) {
    if (state.revealedOuts.has(spot)) return;

    const button = els.attackSpots.find((b) => Number(b.dataset.spot) === spot);

    if (spot === state.hitSpot) {
      button.classList.add('revealed-hit');
      button.querySelector('b').textContent = '◎';

      let bases = spot;
      let label = hitLabels[spot];

      const runs = applyHit(bases);

        resetPitchSequence();

      showResult(
        `${label}！`,
        runs > 0
          ? `${runs}点入りました。ヒットが出たので、次の勝負は守備が4か所を隠し直します。`
          : 'ヒットが出たので、次の勝負は守備が4か所を隠し直します。',
        `守備の◎：${spotLabels[spot]}`,
        'newPitch'
      );
      return;
    }

    state.revealedOuts.add(spot);
    state.outs += 1;

    button.disabled = true;
    button.classList.add('revealed-out');
    button.querySelector('b').textContent = '×';

    if (state.outs >= 3) {
      showResult(
        '3アウト！',
        '攻守交代です。残っている判定マーカーは公開せず、そのままチェンジします。',
        `今回選んだ${spotLabels[spot]}は ×`,
        'change'
      );
      return;
    }

    showResult(
      'アウト！',
      '配置はそのままです。守備は隠し直しません。',
      `今回選んだ${spotLabels[spot]}は ×`,
      'continueGuess'
    );
  }

  function applyHit(bases) {
    if (bases === 4) {
      const runners = state.bases.filter(Boolean).length;
      const runs = runners + 1;
      state.scores[offenseIndex()] += runs;
      resetBases(false);
      updateAll();
      return runs;
    }

    let runs = 0;

    if (state.outs === 0) {
      const newBases = [false, false, false];

      for (let i = 2; i >= 0; i -= 1) {
        if (!state.bases[i]) continue;
        const destination = i + bases;
        if (destination >= 3) {
          runs += 1;
        } else {
          newBases[destination] = true;
        }
      }

      newBases[bases - 1] = true;
      state.bases = newBases;
    } else {
      // 1 or 2 outs: "push" movement.
      // Unforced runners stay put. The batter occupies the hit base and only
      // runners blocking that base are pushed forward in a chain.
      const result = [...state.bases];
      let carry = true;

      for (let i = bases - 1; i < 3 && carry; i += 1) {
        if (result[i]) {
          // Occupied: this runner is pushed one base, so the carry continues.
          carry = true;
        } else {
          // First empty base receives the pushed runner/batter.
          result[i] = true;
          carry = false;
        }
      }

      // If every base from the hit base onward was occupied, one runner scores.
      if (carry) runs += 1;
      state.bases = result;
    }

    state.scores[offenseIndex()] += runs;
    updateAll();
    return runs;
  }

  function showResult(title, text, detail, action) {
    hideAllPhases();
    setRoleBackdrop(null, '');
    els.resultPhase.classList.remove('hidden');
    els.resultTitle.textContent = title;
    els.resultText.textContent = text;
    els.resultDetail.textContent = detail;
    state.afterResultAction = action;
    updateAll();
  }

  function afterResult() {
    const action = state.afterResultAction;

    if (action === 'continueGuess') {
      showAttack();
      return;
    }

    if (action === 'newPitch') {
      prepareHandoff(
        'defense',
        `${state.players[defenseIndex()]}へ`,
        'ヒットが出たので4か所を隠し直します。攻撃側に見られないよう配置してください。'
      );
      return;
    }

    if (action === 'change') {
      recordHalfScore();
      // 3アウト時点で端末を持っている現在の攻撃側は、
      // 次の半イニングではそのまま守備側になるため、余計な受け渡しを挟まない。
      advanceHalfInning(true);
    }
  }

  function recordHalfScore() {
    const offense = offenseIndex();

    if (!state.extra) {
      const entry = state.inningScores[state.inning - 1];
      if (state.half === 'top') {
        entry.top = state.scores[offense];
      } else {
        const previousTotal = state.inning === 1
          ? 0
          : state.inningScores
              .slice(0, state.inning - 1)
              .reduce((sum, item) => sum + (item.bottomDelta || 0), 0);
        entry.bottom = state.scores[offense];
      }

      const current = state.inningScores[state.inning - 1];
      const prevTop = state.inning === 1 ? 0 : (state.inningScores[state.inning - 2].topCumulative ?? 0);
      const prevBottom = state.inning === 1 ? 0 : (state.inningScores[state.inning - 2].bottomCumulative ?? 0);

      if (state.half === 'top') {
        current.topCumulative = state.scores[0];
        current.topDelta = state.scores[0] - prevTop;
      } else {
        current.bottomCumulative = state.scores[1];
        current.bottomDelta = state.scores[1] - prevBottom;
      }
    } else {
      const extraNo = state.inning - 4;
      if (!state.extraScores[extraNo]) {
        state.extraScores[extraNo] = { top: null, bottom: null };
      }
      if (state.half === 'top') {
        state.extraScores[extraNo].top = state.scores[0];
      } else {
        state.extraScores[extraNo].bottom = state.scores[1];
      }
    }
  }

  function advanceHalfInning(defenseAlreadyHasDevice = false) {
    if (state.half === 'top') {
      state.half = 'bottom';
      startHalfInning(defenseAlreadyHasDevice);
      return;
    }

    if (!state.extra && state.inning >= 3) {
      if (state.scores[0] === state.scores[1]) {
        state.extra = true;
        state.inning = 4;
        state.half = 'top';
        startHalfInning(defenseAlreadyHasDevice);
      } else {
        finishGame();
      }
      return;
    }

    if (state.extra) {
      if (state.scores[0] !== state.scores[1]) {
        finishGame();
        return;
      }
      state.inning += 1;
      state.half = 'top';
      startHalfInning(defenseAlreadyHasDevice);
      return;
    }

    state.inning += 1;
    state.half = 'top';
    startHalfInning(defenseAlreadyHasDevice);
  }

  function renderHistory() {
    const rows = [0, 1].map((playerIndex) => {
      const cells = [];

      for (let i = 0; i < 3; i += 1) {
        const entry = state.inningScores[i];
        const delta = playerIndex === 0 ? entry.topDelta : entry.bottomDelta;
        cells.push(delta == null ? '–' : String(delta));
      }

      let extraTotal = 0;
      let hasExtra = false;
      state.extraScores.forEach((entry, idx) => {
        if (!entry) return;
        const current = playerIndex === 0 ? entry.top : entry.bottom;
        if (current == null) return;
        const prevScore = idx === 0
          ? (playerIndex === 0
              ? (state.inningScores[2].topCumulative ?? state.scores[0])
              : (state.inningScores[2].bottomCumulative ?? state.scores[1]))
          : (playerIndex === 0
              ? (state.extraScores[idx - 1]?.top ?? current)
              : (state.extraScores[idx - 1]?.bottom ?? current));
        extraTotal += current - prevScore;
        hasExtra = true;
      });

      cells.push(hasExtra ? String(extraTotal) : '–');

      return `
        <div class="history-cell history-name">${escapeHtml(state.players[playerIndex])}</div>
        ${cells.map((value) => `<div class="history-cell">${value}</div>`).join('')}
      `;
    });

    els.scoreHistory.innerHTML = rows.join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function updateAll() {
    els.inningLabel.textContent = inningLabelText();
    els.outLabel.textContent = `${state.outs} OUT`;

    els.p1Name.textContent = state.players[0];
    els.p2Name.textContent = state.players[1];
    els.p1Score.textContent = state.scores[0];
    els.p2Score.textContent = state.scores[1];

    els.offenseName.textContent = state.players[offenseIndex()];
    els.defenseName.textContent = state.players[defenseIndex()];

    [els.runner1, els.runner2, els.runner3].forEach((runner, index) => {
      runner.classList.toggle('visible', state.bases[index]);
    });

    const occupied = state.bases
      .map((occupiedBase, index) => occupiedBase ? `${index + 1}塁` : '')
      .filter(Boolean);

    els.baseText.textContent = occupied.length ? `走者：${occupied.join('・')}` : '走者なし';

    renderHistory();
  }

  function startGame() {
    const pair = Math.random() < 0.5 ? ['たけ', 'ゆか'] : ['ゆか', 'たけ'];
    state.players = pair;
    state.scores = [0, 0];
    state.inning = 1;
    state.half = 'top';
    state.extra = false;
    state.inningScores = [
      { top: null, bottom: null },
      { top: null, bottom: null },
      { top: null, bottom: null }
    ];
    state.extraScores = [];
    showScreen('game');
    startHalfInning();
  }

  function finishGame() {
    const [a, b] = state.scores;
    const winner = a > b ? 0 : 1;

    els.winnerTitle.textContent = `${state.players[winner]}の勝ち！`;
    els.finalScore.textContent = `${state.players[0]} ${a} - ${b} ${state.players[1]}`;
    els.winnerMessage.textContent = state.extra
      ? '延長戦までもつれた読み合いを制しました。'
      : '3イニング終了。最終スコアが確定しました。';

    showScreen('end');
  }


  els.startBtn.addEventListener('click', startGame);

  els.restartBtn.addEventListener('click', () => {
    if (window.confirm('現在の試合を終了して最初から戻りますか？')) {
      showScreen('setup');
    }
  });

  els.playAgainBtn.addEventListener('click', () => {
    showScreen('setup');
  });

  els.handoffReadyBtn.addEventListener('click', enterHandoffTarget);

  els.defenseSpots.forEach((button) => {
    button.addEventListener('click', () => {
      selectDefenseSpot(Number(button.dataset.spot));
    });
  });

  els.lockDefenseBtn.addEventListener('click', lockDefense);

  els.attackSpots.forEach((button) => {
    button.addEventListener('click', () => {
      chooseAttackSpot(Number(button.dataset.spot));
    });
  });

  els.resultNextBtn.addEventListener('click', afterResult);

  updateAll();
})();
