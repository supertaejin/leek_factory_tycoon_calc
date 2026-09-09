/*
 * ============================================================
 * Leek Factory Tycoon - Recipe Data
 * ============================================================
 */

const recipes = {

    "Leek": {
        inputs: {},
        outputs: {
            "Leek": 1
        }
    },

    "Leek Soup": {
        inputs: {
            "Leek": 10
        },
        outputs: {
            "Leek Soup": 1
        }
    },

    "Leek Cake": {
        inputs: {
            "Leek Soup": 10
        },
        outputs: {
            "Leek Cake": 1
        }
    },

    "Atomic Leek": {
        inputs: {
            "Leek Cake": 10,
            "Leek Soup": 25
        },
        outputs: {
            "Atomic Leek": 1
        }
    },

    "Barrel of Leek": {
        inputs: {
            "Leek": 10000
        },
        outputs: {
            "Barrel of Leek": 1
        }
    },

    "Golden Leek": {
        inputs: {
            "Atomic Leek": 10,
            "Leek Cake": 50,
            "Barrel of Leek": 0.2
        },
        outputs: {
            "Golden Leek": 1,
            "Leek Soup": 500
        }
    },

    "Ultraleek": {
        inputs: {
            "Golden Leek": 1,
            "Atomic Leek": 20,
            "Leek Soup": 1000,
            "Barrel of Leek": 0.4
        },
        outputs: {
            "Ultraleek": 1,
            "Leek": 100000
        }
    },

    "Atomic Chives": {
        inputs: {
            "Barrel of Leek": 2,
            "Atomic Leek": 20
        },
        outputs: {
            "Atomic Chives": 1
        }
    },

    "Refined Ultraleek": {
        inputs: {
            "Ultraleek": 5,
            "Atomic Chives": 20,
            "Leek": 1000000
        },
        outputs: {
            "Refined Ultraleek": 1,
            "Barrel of Leek": 100
        }
    },

    "Monster Leek": {
        inputs: {
            "Refined Ultraleek": 10,
            "Ultraleek": 50,
            "Golden Leek": 500,
            "Leek": 10000000
        },
        outputs: {
            "Monster Leek": 1
        }
    },

    "Monster Leek XXL": {
        inputs: {
            "Monster Leek": 50,
            "Refined Ultraleek": 1000,
            "Ultraleek": 15000,
            "Atomic Leek": 1000000
        },
        outputs: {
            "Monster Leek XXL": 1
        }
    },

    "Quantum Leek": {
        inputs: {
            "Monster Leek XXL": 75,
            "Monster Leek": 10000,
            "Atomic Chives": 5000000,
            "Refined Ultraleek": 150000,
            "Ultraleek": 2000000
        },
        outputs: {
            "Quantum Leek": 1
        }
    }
};


/*
 * ============================================================
 * 시설별 생산량 입력 ID 맵
 * ============================================================
 */

const productionInputs = {
    "Leek": "rate_leek",
    "Leek Soup": "rate_soup",
    "Leek Cake": "rate_cake",
    "Atomic Leek": "rate_atomic_leek",
    "Barrel of Leek": "rate_barrel",
    "Golden Leek": "rate_golden",
    "Ultraleek": "rate_ultra",
    "Atomic Chives": "rate_chive",
    "Refined Ultraleek": "rate_refined",
    "Monster Leek": "rate_monster",
    "Monster Leek XXL": "rate_monster_xxl",
    "Quantum Leek": "rate_quantum"
};


/*
 * ============================================================
 * 표시 순서
 * ============================================================
 */

const resourceOrder = [
    "Leek",
    "Leek Soup",
    "Leek Cake",
    "Atomic Leek",
    "Barrel of Leek",
    "Golden Leek",
    "Ultraleek",
    "Atomic Chives",
    "Refined Ultraleek",
    "Monster Leek",
    "Monster Leek XXL",
    "Quantum Leek"
];


/*
 * ============================================================
 * 숫자 포맷팅
 * ============================================================
 */

function formatNumber(num) {
    const abs = Math.abs(num);

    if (abs >= 1000000000) {
        return (num / 1000000000).toFixed(2) + "B";
    }

    if (abs >= 1000000) {
        return (num / 1000000).toFixed(2) + "M";
    }

    if (abs >= 1000) {
        return (num / 1000).toFixed(2) + "K";
    }

    if (abs >= 1) {
        return num.toFixed(2);
    }

    return num.toFixed(4);
}


/*
 * ============================================================
 * 입력식 평가 (예: 0.1 + 0.2)
 * ============================================================
 */

function evaluateExpression(expression) {
    const normalized = expression
        .replace(/,/g, "")
        .replace(/\s+/g, "");

    if (!normalized) return 0;

    const parts = normalized.split("+");

    if (parts.some(part => !/^\d*\.?\d+$/.test(part))) {
        return null;
    }

    return parts.reduce((sum, part) => {
        return sum + parseFloat(part);
    }, 0);
}


function getProductionRates() {
    const rates = {};

    for (const [resource, inputId] of Object.entries(productionInputs)) {
        const inputElem = document.getElementById(inputId);
        if (!inputElem) continue;

        const value = evaluateExpression(inputElem.value);
        rates[resource] = value !== null ? value : 0;
    }

    return rates;
}


/*
 * ============================================================
 * 흐름 계산
 * ============================================================
 */

function calculateFlow() {
    const rates = getProductionRates();

    const net = {};
    const produced = {};
    const consumed = {};

    for (const resource of resourceOrder) {
        net[resource] = 0;
        produced[resource] = 0;
        consumed[resource] = 0;
    }

    for (const [facility, rate] of Object.entries(rates)) {
        if (rate === 0) continue;

        const recipe = recipes[facility];
        if (!recipe) continue;

        // 메인 Output 단위 생산량 기준 가동 배율(crafting rate) 계산
        const primaryOutputAmount = recipe.outputs[facility] || 1;
        const craftRate = rate / primaryOutputAmount;

        // Input 소비 계산
        for (const [resource, amount] of Object.entries(recipe.inputs)) {
            const value = craftRate * amount;

            if (!(resource in consumed)) {
                consumed[resource] = 0;
                produced[resource] = 0;
                net[resource] = 0;
            }

            consumed[resource] += value;
            net[resource] -= value;
        }

        // Output 생산 계산 (부산물 포함)
        for (const [resource, amount] of Object.entries(recipe.outputs)) {
            const value = craftRate * amount;

            if (!(resource in produced)) {
                produced[resource] = 0;
                consumed[resource] = 0;
                net[resource] = 0;
            }

            produced[resource] += value;
            net[resource] += value;
        }
    }

    renderResults(net, produced, consumed);
}


/*
 * ============================================================
 * 결과 화면 표시
 * ============================================================
 */

function renderResults(net, produced, consumed) {
    const tbody = document.getElementById("resultBody");
    tbody.innerHTML = "";

    let deficitCount = 0;
    let surplusCount = 0;
    let balanceCount = 0;

    for (const resource of resourceOrder) {
        const flow = net[resource] || 0;
        const prod = produced[resource] || 0;
        const cons = consumed[resource] || 0;

        let statusClass;
        let statusText;

        const epsilon = 0.0000001;

        if (Math.abs(flow) < epsilon) {
            statusClass = "balanced";
            statusText = "⚖️ 균형";
            balanceCount++;
        } else if (flow < 0) {
            statusClass = "deficit";
            statusText = "⚠️ 부족";
            deficitCount++;
        } else {
            statusClass = "surplus";
            statusText = "✅ 잉여";
            surplusCount++;
        }

        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${resource}</strong></td>
            <td>${formatNumber(prod)}/s</td>
            <td>${formatNumber(cons)}/s</td>
            <td class="${statusClass}">
                ${flow >= 0 ? "+" : ""}${formatNumber(flow)}/s
            </td>
            <td class="${statusClass}">
                ${statusText}
            </td>
        `;

        tbody.appendChild(row);
    }

    document.getElementById("deficitCount").textContent = deficitCount;
    document.getElementById("balanceCount").textContent = balanceCount;
    document.getElementById("surplusCount").textContent = surplusCount;
    document.getElementById("resultsSection").style.display = "block";
}


/*
 * ============================================================
 * 이벤트 리스너 등록 및 초기 실행
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", function() {
    // 버튼 클릭 이벤트
    const calcBtn = document.getElementById("calcBtn");
    if (calcBtn) {
        calcBtn.addEventListener("click", calculateFlow);
    }

    // Enter 키 입력 이벤트
    document.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            calculateFlow();
        }
    });

    // 페이지 로드시 바로 최초 계산
    calculateFlow();
});
