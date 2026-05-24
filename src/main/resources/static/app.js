const STORAGE_KEY = "moneyrocket.mvp.v1";

const defaultState = {
  age: "",
  targetAge: "",
  goalAmount: "",
  cashAmount: "",
  monthlyIncome: "",
  fixedExpense: "",
  variableExpense: "",
  assets: [],
  aiFeedbackItems: [],
  lastAiFeedbackAt: 0,
  lastAiFeedbackSignature: "",
};

let state = loadState();
let currentPerSecond = 0;
let animatedTotal = 0;
let lastTick = performance.now();
let feedbackCooldownTimer = null;

const AI_FEEDBACK_COOLDOWN_MS = 10 * 60 * 1000;

const assetColors = ["#3182F6", "#FF8A34", "#00B894", "#7C5CFF", "#F2C94C", "#2D9CDB"];

const fields = {
  age: document.querySelector("#age"),
  targetAge: document.querySelector("#targetAge"),
  goalAmount: document.querySelector("#goalAmount"),
  cashAmount: document.querySelector("#cashAmount"),
  monthlyIncome: document.querySelector("#monthlyIncome"),
  fixedExpense: document.querySelector("#fixedExpense"),
  variableExpense: document.querySelector("#variableExpense"),
};

const output = {
  saveState: document.querySelector("#saveState"),
  homeTitle: document.querySelector("#homeTitle"),
  heroProgress: document.querySelector("#heroProgress"),
  trailFill: document.querySelector("#trailFill"),
  rocketWrap: document.querySelector("#rocketWrap"),
  moneyBubble: document.querySelector("#moneyBubble"),
  goalSummary: document.querySelector("#goalSummary"),
  currentSummary: document.querySelector("#currentSummary"),
  remainingSummary: document.querySelector("#remainingSummary"),
  timeSummary: document.querySelector("#timeSummary"),
  perSecondHome: document.querySelector("#perSecondHome"),
  arrivalAgeHome: document.querySelector("#arrivalAgeHome"),
  monthlyTargetHome: document.querySelector("#monthlyTargetHome"),
  monthlySaving: document.querySelector("#monthlySaving"),
  assetContribution: document.querySelector("#assetContribution"),
  savingRate: document.querySelector("#savingRate"),
  fixedRatio: document.querySelector("#fixedRatio"),
  savingOnlyTime: document.querySelector("#savingOnlyTime"),
  withGrowthTime: document.querySelector("#withGrowthTime"),
  weightedReturn: document.querySelector("#weightedReturn"),
  arrivalAge: document.querySelector("#arrivalAge"),
  allocationChart: document.querySelector("#allocationChart"),
  allocationList: document.querySelector("#allocationList"),
  feedbackList: document.querySelector("#feedbackList"),
  scenarioText: document.querySelector("#scenarioText"),
  aiStatus: document.querySelector("#aiStatus"),
};

const assetList = document.querySelector("#assetList");
const moneyForm = document.querySelector("#moneyForm");
const addAssetButton = document.querySelector("#addAssetButton");
const resetButton = document.querySelector("#resetButton");
const applyInputButton = document.querySelector("#applyInputButton");
const aiFeedbackButton = document.querySelector("#aiFeedbackButton");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved) {
      return structuredClone(defaultState);
    }

    return {
      ...structuredClone(defaultState),
      ...saved,
      assets: Array.isArray(saved.assets) ? saved.assets : structuredClone(defaultState.assets),
      aiFeedbackItems: [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  output.saveState.textContent = "자동 저장됨";
}

function numberValue(value) {
  return Number(value) || 0;
}

function formatWon(value) {
  const rounded = Math.round(numberValue(value));
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";

  if (abs >= 100000000) {
    const uk = Math.floor(abs / 100000000);
    const restAfterUk = abs % 100000000;
    const man = Math.floor(restAfterUk / 10000);
    const wonRest = restAfterUk % 10000;

    let result = `${uk}억`;

    if (man > 0) {
      result += `${man}만`;
    }

    if (wonRest > 0) {
      result += `${wonRest}원`;
    }

    return `${sign}${result}`;
  }

  if (abs >= 10000) {
    const man = Math.floor(abs / 10000);
    const wonRest = abs % 10000;

    if (wonRest > 0) {
      return `${sign}${man}만${wonRest}원`;
    }

    return `${sign}${man}만원`;
  }

  return `${sign}${abs}원`;
}

function formatMoneyPreview(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (numericValue === 0) {
    return "0원";
  }

  const rounded = Math.round(numericValue);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";
  const uk = Math.floor(abs / 100000000);
  const man = Math.floor((abs % 100000000) / 10000);
  const won = abs % 10000;
  const parts = [];

  if (uk > 0) {
    parts.push(`${uk.toLocaleString("ko-KR")}억`);
  }

  if (man > 0) {
    parts.push(`${man.toLocaleString("ko-KR")}만`);
  }

  if (won > 0) {
    parts.push(`${won.toLocaleString("ko-KR")}원`);
  }

  if (won === 0) {
    return `${sign}${parts.join(" ")}원`;
  }

  return `${sign}${parts.join(" ")}`;
}

function updateMoneyPreview(preview, value) {
  const text = formatMoneyPreview(value);

  preview.textContent = text;
  preview.classList.toggle("visible", text.length > 0);
}

function renderMoneyPreviews() {
  document.querySelectorAll("[data-money-preview-for]").forEach((preview) => {
    const input = document.getElementById(preview.dataset.moneyPreviewFor);
    updateMoneyPreview(preview, input?.value);
  });

  document.querySelectorAll("[data-money-preview-field]").forEach((preview) => {
    const row = preview.closest("label");
    const input = row?.querySelector(`[data-field="${preview.dataset.moneyPreviewField}"]`);
    updateMoneyPreview(preview, input?.value);
  });
}

function formatMonthCount(months) {
  if (!Number.isFinite(months)) {
    return "계산 불가";
  }

  if (months <= 0) {
    return "이미 도착";
  }

  const rounded = Math.ceil(months);
  const years = Math.floor(rounded / 12);
  const leftMonths = rounded % 12;

  if (years === 0) {
    return `${leftMonths}개월`;
  }

  if (leftMonths === 0) {
    return `${years}년`;
  }

  return `${years}년 ${leftMonths}개월`;
}

function formatProgress(value) {
  const numericValue = numberValue(value);

  if (numericValue <= 0) {
    return "0.000000%";
  }

  if (numericValue >= 100) {
    return "100.000000%";
  }

  return `${numericValue.toFixed(6)}%`;
}

function getFeedbackSignature(projection = calculateProjection()) {
  return JSON.stringify(buildAiPayload(projection));
}

function getFeedbackWaitMs(projection = calculateProjection()) {
  const signature = getFeedbackSignature(projection);

  if (signature !== state.lastAiFeedbackSignature) {
    return 0;
  }

  return Math.max(AI_FEEDBACK_COOLDOWN_MS - (Date.now() - numberValue(state.lastAiFeedbackAt)), 0);
}

function formatWaitTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}초`;
  }

  return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}

function calculateProjection(extraMonthly = 0) {
  const totalAssets = state.assets.reduce((sum, asset) => sum + numberValue(asset.amount), 0);
  const assetContribution = state.assets.reduce(
    (sum, asset) => sum + numberValue(asset.monthlyContribution),
    0,
  );

  const monthlyIncome = numberValue(state.monthlyIncome);
  const fixedExpense = numberValue(state.fixedExpense);
  const variableExpense = numberValue(state.variableExpense);
  const cashAmount = numberValue(state.cashAmount);
  const goalAmount = numberValue(state.goalAmount);

  const monthlySurplus = monthlyIncome - fixedExpense - variableExpense;
  const monthlyCashSaving = monthlySurplus - assetContribution + extraMonthly;
  const currentTotal = cashAmount + totalAssets;
  const remaining = Math.max(goalAmount - currentTotal, 0);
  const progress = goalAmount > 0 ? Math.min((currentTotal / goalAmount) * 100, 100) : 0;

  const savingOnlyMonths = monthlySurplus + extraMonthly > 0
    ? remaining / (monthlySurplus + extraMonthly)
    : Infinity;

  const weightedReturn = totalAssets > 0
    ? state.assets.reduce(
        (sum, asset) => sum + numberValue(asset.amount) * numberValue(asset.annualReturn),
        0,
      ) / totalAssets
    : 0;

  let cash = cashAmount;
  let assets = state.assets.map((asset) => ({ ...asset }));
  let growthMonths = remaining <= 0 ? 0 : Infinity;

  if (monthlySurplus + extraMonthly > 0 || assets.some((asset) => numberValue(asset.annualReturn) > 0)) {
    for (let month = 1; month <= 1200; month += 1) {
      cash += monthlyCashSaving;

      assets = assets.map((asset) => ({
        ...asset,
        amount:
          numberValue(asset.amount) * (1 + numberValue(asset.annualReturn) / 100 / 12) +
          numberValue(asset.monthlyContribution),
      }));

      const projectedTotal = cash + assets.reduce((sum, asset) => sum + numberValue(asset.amount), 0);

      if (projectedTotal >= goalAmount) {
        growthMonths = month;
        break;
      }
    }
  }

  const monthlyGrowth = state.assets.reduce(
    (sum, asset) => sum + numberValue(asset.amount) * (numberValue(asset.annualReturn) / 100 / 12),
    0,
  );

  const perSecond = Math.max((monthlySurplus + monthlyGrowth + extraMonthly) / (30 * 24 * 60 * 60), 0);

  return {
    totalAssets,
    assetContribution,
    monthlySurplus,
    monthlyCashSaving,
    currentTotal,
    remaining,
    progress,
    savingOnlyMonths,
    growthMonths,
    weightedReturn,
    monthlyGrowth,
    perSecond,
  };
}

function bindStateToInputs() {
  Object.entries(fields).forEach(([key, input]) => {
    input.value = state[key] ?? "";
  });
}

function readInputsToState() {
  Object.entries(fields).forEach(([key, input]) => {
    state[key] = input.value;
  });
}

function readAssetsToState() {
  const rows = [...assetList.querySelectorAll(".asset-row")];

  state.assets = rows.map((row) => ({
    id: row.dataset.assetId || crypto.randomUUID(),
    name: row.querySelector('[data-field="name"]')?.value || "새 자산",
    type: row.querySelector('[data-field="type"]')?.value || "주식/ETF",
    amount: row.querySelector('[data-field="amount"]')?.value || 0,
    monthlyContribution: row.querySelector('[data-field="monthlyContribution"]')?.value || 0,
    annualReturn: row.querySelector('[data-field="annualReturn"]')?.value || 0,
  }));
}

function renderAssets() {
  assetList.innerHTML = "";

  state.assets.forEach((asset, index) => {
    const row = document.createElement("article");
    row.className = "asset-row";
    row.dataset.assetId = asset.id;

    row.innerHTML = `
      <div class="asset-row-header">
        <strong>자산 ${index + 1}</strong>
        <button class="delete-button" type="button" data-action="delete">삭제</button>
      </div>
      <div class="asset-grid">
        <label>
          이름
          <input data-field="name" type="text" value="${escapeHtml(asset.name)}" />
        </label>
        <label>
          종류
          <select data-field="type">
            ${["현금", "예금/적금", "주식/ETF", "코인", "부업/기타"]
              .map((type) => `<option value="${type}" ${asset.type === type ? "selected" : ""}>${type}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          현재 금액
          <div class="money-input-row">
            <input data-field="amount" type="number" min="0" step="10000" value="${asset.amount ?? ""}" />
            <span class="money-preview" data-money-preview-field="amount" aria-live="polite"></span>
          </div>
        </label>
        <label>
          월 납입
          <div class="money-input-row">
            <input data-field="monthlyContribution" type="number" min="0" step="10000" value="${asset.monthlyContribution ?? ""}" />
            <span class="money-preview" data-money-preview-field="monthlyContribution" aria-live="polite"></span>
          </div>
        </label>
        <label>
          연수익률
          <input data-field="annualReturn" type="number" step="0.1" value="${asset.annualReturn ?? ""}" />
        </label>
      </div>
    `;

    assetList.append(row);
  });

  renderMoneyPreviews();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAllocation(projection) {
  const categories = new Map();
  categories.set("현금/저축", numberValue(state.cashAmount));

  state.assets.forEach((asset) => {
    categories.set(asset.type, (categories.get(asset.type) || 0) + numberValue(asset.amount));
  });

  const entries = [...categories.entries()].filter(([, amount]) => amount > 0);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  let degrees = 0;

  if (total <= 0) {
    output.allocationChart.style.background = "#E5E8EB";
    output.allocationList.innerHTML = `
      <div class="allocation-item">
        <span></span>
        <strong>입력된 자산이 없어요</strong>
        <span>0%</span>
      </div>
    `;
    return;
  }

  const gradientParts = entries.map(([, amount], index) => {
    const color = assetColors[index % assetColors.length];
    const start = degrees;
    const end = degrees + (amount / total) * 360;
    degrees = end;
    return `${color} ${start}deg ${end}deg`;
  });

  output.allocationChart.style.background = `conic-gradient(${gradientParts.join(", ")})`;
  output.allocationList.innerHTML = entries
    .map(([label, amount], index) => {
      const ratio = projection.currentTotal > 0 ? (amount / projection.currentTotal) * 100 : 0;

      return `
        <div class="allocation-item">
          <span class="swatch" style="background:${assetColors[index % assetColors.length]}"></span>
          <strong>${label}</strong>
          <span>${ratio.toFixed(1)}%</span>
        </div>
      `;
    })
    .join("");
}

function renderLocalGuidance(projection) {
  const monthlyIncome = numberValue(state.monthlyIncome);
  const fixedExpense = numberValue(state.fixedExpense);
  const age = numberValue(state.age);
  const targetAge = numberValue(state.targetAge);
  const goalAmount = numberValue(state.goalAmount);

  const savingRate = monthlyIncome > 0 ? (projection.monthlySurplus / monthlyIncome) * 100 : 0;
  const fixedRatio = monthlyIncome > 0 ? (fixedExpense / monthlyIncome) * 100 : 0;
  const targetMonths = Math.max((targetAge - age) * 12, 0);
  const feedback = [];

  if (projection.monthlyCashSaving < 0) {
    feedback.push("월 자산 납입액까지 반영하면 현금흐름이 마이너스예요. 납입액이나 지출을 먼저 조정해보세요.");
  } else if (projection.currentTotal === 0 && goalAmount === 0) {
    feedback.push("목표 금액과 현재 현금/저축을 입력하면 목표까지 남은 금액을 계산해요.");
    feedback.push("월급과 지출을 입력하면 목표까지 남은 기간을 볼 수 있어요.");
    feedback.push("투자나 부업 수익은 자산 추가 버튼으로 직접 입력할 수 있어요.");
  } else if (savingRate >= 40) {
    feedback.push("저축률이 높은 편이라 목표 행성까지 가는 속도가 빠른 상태예요.");
  } else if (savingRate >= 20) {
    feedback.push("저축률은 안정적이에요. 월 지출을 조금만 줄여도 도착 시간이 꽤 당겨질 수 있어요.");
  } else {
    feedback.push("저축률이 낮은 편이에요. 고정지출과 변동지출을 나눠서 먼저 확인해보는 게 좋아요.");
  }

  feedback.push(
    fixedRatio > 45
      ? "고정지출 비중이 커요. 매달 자동으로 나가는 비용을 줄이면 목표 속도가 빨라져요."
      : "고정지출 비중은 비교적 안정적이에요. 변동지출 관리가 다음 포인트예요.",
  );

  if (projection.weightedReturn > 0) {
    feedback.push(`현재 입력한 자산의 가중 평균 연수익률은 ${projection.weightedReturn.toFixed(1)}%예요.`);
  } else {
    feedback.push("자산 성장률을 입력하면 저축만 했을 때와 도착 시간을 비교할 수 있어요.");
  }

  if (targetMonths > 0 && Number.isFinite(projection.growthMonths)) {
    feedback.push(
      projection.growthMonths <= targetMonths
        ? `희망 목표 나이보다 ${formatMonthCount(targetMonths - projection.growthMonths)} 빠르게 도착할 수 있어요.`
        : `희망 목표 나이보다 ${formatMonthCount(projection.growthMonths - targetMonths)} 늦을 수 있어요.`,
    );
  }

  output.feedbackList.innerHTML = feedback.map((text) => `<li>${escapeHtml(text)}</li>`).join("");

  const tenMore = calculateProjection(100000);
  output.scenarioText.textContent = Number.isFinite(tenMore.growthMonths)
    ? `월 10만원을 더 모으면 남은 기간은 ${formatMonthCount(tenMore.growthMonths)}로 바뀌어요.`
    : "월 10만원을 더 모아도 목표 도착 계산이 어려워요.";
}

function renderScenarioPreview() {
  const tenMore = calculateProjection(100000);

  output.scenarioText.textContent = Number.isFinite(tenMore.growthMonths)
    ? `월 10만원을 더 모으면 남은 기간은 ${formatMonthCount(tenMore.growthMonths)}로 바뀌어요.`
    : "월 10만원을 더 모아도 목표 도착 계산이 어려워요.";
}

function buildAiPayload(projection) {
  return {
    age: numberValue(state.age),
    targetAge: numberValue(state.targetAge),
    goalAmount: numberValue(state.goalAmount),
    currentTotal: Math.round(projection.currentTotal),
    remaining: Math.round(projection.remaining),
    monthlyIncome: numberValue(state.monthlyIncome),
    fixedExpense: numberValue(state.fixedExpense),
    variableExpense: numberValue(state.variableExpense),
    monthlySurplus: Math.round(projection.monthlySurplus),
    monthlyCashSaving: Math.round(projection.monthlyCashSaving),
    assetContribution: Math.round(projection.assetContribution),
    savingOnlyMonths: Number.isFinite(projection.savingOnlyMonths) ? Math.ceil(projection.savingOnlyMonths) : null,
    growthMonths: Number.isFinite(projection.growthMonths) ? Math.ceil(projection.growthMonths) : null,
    weightedReturn: Number(projection.weightedReturn.toFixed(2)),
    assets: state.assets.map((asset) => ({
      name: asset.name,
      type: asset.type,
      amount: numberValue(asset.amount),
      monthlyContribution: numberValue(asset.monthlyContribution),
      annualReturn: numberValue(asset.annualReturn),
    })),
  };
}

function validateAiFeedbackRequest(projection) {
  const errors = [];

  const age = numberValue(state.age);
  const targetAge = numberValue(state.targetAge);
  const goalAmount = numberValue(state.goalAmount);
  const currentTotal = numberValue(projection.currentTotal);
  const monthlyIncome = numberValue(state.monthlyIncome);
  const fixedExpense = numberValue(state.fixedExpense);
  const variableExpense = numberValue(state.variableExpense);

  if (age < 0) {
    errors.push("현재 나이는 0 이상이어야 합니다.");
  }

  if (targetAge < 0) {
    errors.push("희망 목표 나이는 0 이상이어야 합니다.");
  }

  if (age > 0 && targetAge > 0 && targetAge <= age) {
    errors.push("희망 목표 나이는 현재 나이보다 커야 합니다.");
  }

  if (goalAmount < 0) {
    errors.push("목표 금액은 0원 이상이어야 합니다.");
  }

  if (currentTotal < 0) {
    errors.push("현재 자산은 0원 이상이어야 합니다.");
  }

  if (monthlyIncome < 0) {
    errors.push("월 실수령액은 0원 이상이어야 합니다.");
  }

  if (fixedExpense < 0) {
    errors.push("월 고정지출은 0원 이상이어야 합니다.");
  }

  if (variableExpense < 0) {
    errors.push("월 변동지출은 0원 이상이어야 합니다.");
  }

  state.assets.forEach((asset, index) => {
    if (numberValue(asset.amount) < 0) {
      errors.push(`자산 ${index + 1}의 현재 금액은 0원 이상이어야 합니다.`);
    }

    if (numberValue(asset.monthlyContribution) < 0) {
      errors.push(`자산 ${index + 1}의 월 납입액은 0원 이상이어야 합니다.`);
    }

    if (numberValue(asset.annualReturn) < -100) {
      errors.push(`자산 ${index + 1}의 연수익률은 -100% 이상이어야 합니다.`);
    }
  });

  return errors;
}

function renderFeedbackItems(items) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (safeItems.length === 0) {
    output.feedbackList.innerHTML = "";
    return;
  }

  output.feedbackList.innerHTML = safeItems
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join("");
}

function updateAiFeedbackButton() {
  if (!aiFeedbackButton) {
    return;
  }

  const waitMs = getFeedbackWaitMs();
  const hasSameFeedback = waitMs > 0;

  aiFeedbackButton.disabled = hasSameFeedback;
  aiFeedbackButton.textContent = hasSameFeedback
    ? `${formatWaitTime(waitMs)} 후 다시 요청 가능`
    : "AI 피드백 받기";

  if (hasSameFeedback && output.aiStatus.textContent === "AI 피드백 생성 완료") {
    output.aiStatus.textContent = "같은 입력값은 잠시 후 다시 요청할 수 있어요. 금액을 바꾸면 바로 새 피드백을 받을 수 있어요.";
  }
}

function startFeedbackCooldownTimer() {
  window.clearInterval(feedbackCooldownTimer);
  feedbackCooldownTimer = window.setInterval(updateAiFeedbackButton, 1000);
  updateAiFeedbackButton();
}

async function requestAiFeedback() {
  readInputsToState();
  readAssetsToState();

  const projection = calculateProjection();
  const validationErrors = validateAiFeedbackRequest(projection);
  const waitMs = getFeedbackWaitMs(projection);

  output.aiStatus.classList.remove("error");

  if (waitMs > 0) {
    output.aiStatus.textContent = `같은 입력값은 ${formatWaitTime(waitMs)} 후 다시 요청할 수 있어요. 금액을 바꾸면 바로 새 피드백을 받을 수 있어요.`;
    updateAiFeedbackButton();
    return;
  }

  if (validationErrors.length > 0) {
    output.aiStatus.classList.add("error");
    output.aiStatus.textContent = validationErrors[0];
    output.feedbackList.innerHTML = validationErrors
      .map((message) => `<li>${escapeHtml(message)}</li>`)
      .join("");
    return;
  }

  saveState();

  output.aiStatus.textContent = "AI가 입력값을 분석하고 있어요...";
  aiFeedbackButton.disabled = true;

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildAiPayload(projection)),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "AI 피드백 생성에 실패했어요.");
    }

    const items = [result.summary, ...(result.feedback || []), result.riskNote].filter(Boolean);

    state.aiFeedbackItems = items;
    state.lastAiFeedbackAt = Date.now();
    state.lastAiFeedbackSignature = getFeedbackSignature(projection);

    saveState();
    renderFeedbackItems(state.aiFeedbackItems);

    output.aiStatus.textContent = "AI 피드백 생성 완료";
  } catch (error) {
    output.aiStatus.classList.add("error");
    output.aiStatus.textContent = error.message;
  } finally {
    updateAiFeedbackButton();
  }
}

function renderLiveProgress(projection, liveTotal) {
  const goalAmount = numberValue(state.goalAmount);
  const liveCurrentTotal = Math.max(liveTotal, 0);
  const liveRemaining = Math.max(goalAmount - liveCurrentTotal, 0);
  const liveProgress = goalAmount > 0 ? Math.min((liveCurrentTotal / goalAmount) * 100, 100) : 0;
  const progressRatio = liveProgress / 100;
  const orbitRect = document.querySelector(".orbit").getBoundingClientRect();
  const trailAngleRadians = -25 * Math.PI / 180;
  const trailStartX = orbitRect.width * 0.08;
  const trailStartY = orbitRect.height * 0.66;
  const trailLength = orbitRect.width * 0.8;
  const rocketX = trailStartX + Math.cos(trailAngleRadians) * trailLength * progressRatio;
  const rocketY = trailStartY + Math.sin(trailAngleRadians) * trailLength * progressRatio;
  const progressLabel = formatProgress(liveProgress);

  output.homeTitle.textContent = `목표까지 ${progressLabel} 지점`;
  output.heroProgress.textContent = progressLabel;
  output.trailFill.style.width = `${Math.max(24, trailLength * progressRatio)}px`;
  output.rocketWrap.style.left = `${rocketX}px`;
  output.rocketWrap.style.top = `${rocketY}px`;
  output.currentSummary.textContent = formatWon(liveCurrentTotal);
  output.remainingSummary.textContent = formatWon(liveRemaining);
}

function render() {
  const projection = calculateProjection();

  const age = numberValue(state.age);
  const monthlyIncome = numberValue(state.monthlyIncome);
  const fixedExpense = numberValue(state.fixedExpense);

  const savingRate = monthlyIncome > 0 ? (projection.monthlySurplus / monthlyIncome) * 100 : 0;
  const fixedRatio = monthlyIncome > 0 ? (fixedExpense / monthlyIncome) * 100 : 0;

  const arrivalAgeText = Number.isFinite(projection.growthMonths)
    ? `${Math.floor(age + projection.growthMonths / 12)}세 ${Math.ceil(projection.growthMonths % 12)}개월`
    : "계산 불가";

  currentPerSecond = projection.perSecond;

  renderLiveProgress(projection, projection.currentTotal + animatedTotal);

  output.goalSummary.textContent = formatWon(state.goalAmount);
  output.timeSummary.textContent = formatMonthCount(projection.growthMonths);

  output.perSecondHome.textContent = `+${projection.perSecond.toFixed(2)}원`;
  output.arrivalAgeHome.textContent = arrivalAgeText;
  output.monthlyTargetHome.textContent = formatWon(projection.monthlySurplus);

  output.monthlySaving.textContent = formatWon(projection.monthlyCashSaving);
  output.assetContribution.textContent = formatWon(projection.assetContribution);
  output.savingRate.textContent = `${savingRate.toFixed(1)}%`;
  output.fixedRatio.textContent = `${fixedRatio.toFixed(1)}%`;
  output.savingOnlyTime.textContent = formatMonthCount(projection.savingOnlyMonths);
  output.withGrowthTime.textContent = formatMonthCount(projection.growthMonths);
  output.weightedReturn.textContent = `${projection.weightedReturn.toFixed(1)}%`;
  output.arrivalAge.textContent = arrivalAgeText;

  renderAllocation(projection);
  renderFeedbackItems(state.aiFeedbackItems);
  renderScenarioPreview();
  renderMoneyPreviews();
  startFeedbackCooldownTimer();
}

function moveToTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-page").forEach((page) => {
    page.classList.toggle("active", page.id === `tab-${tabName}`);
  });
}

function applyInputs() {
  readInputsToState();
  readAssetsToState();
  state.aiFeedbackItems = [];
  saveState();

  animatedTotal = 0;

  renderAssets();
  render();
  moveToTab("home");

  output.saveState.textContent = "반영 완료";
}

function markInputChanged() {
  state.aiFeedbackItems = [];
  state.lastAiFeedbackSignature = "";
  renderMoneyPreviews();
  renderFeedbackItems([]);
  output.aiStatus.classList.remove("error");
  output.aiStatus.textContent = "입력값이 바뀌었어요. 반영 후 새 AI 피드백을 받을 수 있어요.";
  output.saveState.textContent = "입력값 미반영";
  updateAiFeedbackButton();
}

function addAsset() {
  readInputsToState();
  readAssetsToState();

  state.assets.push({
    id: crypto.randomUUID(),
    name: "새 자산",
    type: "주식/ETF",
    amount: 0,
    monthlyContribution: 0,
    annualReturn: 5,
  });

  renderAssets();
  markInputChanged();
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    moveToTab(button.dataset.tab);
  });
});

moneyForm.addEventListener("input", markInputChanged);

addAssetButton.addEventListener("click", addAsset);

applyInputButton.addEventListener("click", applyInputs);

aiFeedbackButton.addEventListener("click", requestAiFeedback);

resetButton.addEventListener("click", () => {
  state = structuredClone(defaultState);

  bindStateToInputs();
  renderAssets();
  saveState();

  animatedTotal = 0;

  render();
  moveToTab("home");

  output.saveState.textContent = "초기화 완료";
});

assetList.addEventListener("input", markInputChanged);

assetList.addEventListener("click", (event) => {
  if (event.target.dataset.action !== "delete") {
    return;
  }

  const row = event.target.closest(".asset-row");

  state.assets = state.assets.filter((asset) => asset.id !== row.dataset.assetId);

  renderAssets();
  markInputChanged();
});

function animateMoney(now) {
  const deltaSeconds = Math.max((now - lastTick) / 1000, 0);
  lastTick = now;

  animatedTotal += currentPerSecond * deltaSeconds;
  output.moneyBubble.textContent = `+${animatedTotal.toFixed(2)}원`;

  const projection = calculateProjection();
  renderLiveProgress(projection, projection.currentTotal + animatedTotal);

  requestAnimationFrame(animateMoney);
}

bindStateToInputs();
renderAssets();
render();
requestAnimationFrame(animateMoney);
