/*
 * ============================================================
 * Leek Factory Tycoon - Recipe Data & Target Calculator
 * ============================================================
 */

const recipes = {
    "Leek": {
        inputs: {},
        outputs: { "Leek": 1 }
    },
    "Leek Soup": {
        inputs: { "Leek": 10 },
        outputs: { "Leek Soup": 1 }
    },
    "Leek Cake": {
        inputs: { "Leek Soup": 10 },
        outputs: { "Leek Cake": 1 }
    },
    "Atomic Leek": {
        inputs: { "Leek Cake": 10, "Leek Soup": 25 },
        outputs: { "Atomic Leek": 1 }
    },
    "Barrel of Leek": {
        inputs: { "Leek": 10000 },
        outputs: { "Barrel of Leek": 1 }
    },
    "Golden Leek": {
        inputs: { "Atomic Leek": 10, "Leek Cake": 50, "Barrel of Leek": 0.2 },
        outputs: { "Golden Leek": 1, "Leek Soup": 500 }
    },
    "Ultraleek": {
        inputs: { "Golden Leek": 10, "Atomic Leek": 20, "Leek Soup": 1000, "Barrel of Leek": 0.4 },
        outputs: { "Ultraleek": 1, "Leek": 100000 }
    },
    "Atomic Chives": {
        inputs: { "Barrel of Leek": 2, "Atomic Leek": 20 },
        outputs: { "Atomic Chives": 1 }
    },
    "Refined Ultraleek": {
        inputs: { "Ultraleek": 5, "Atomic Chives": 20, "Leek": 1000000 },
        outputs: { "Refined Ultraleek": 1, "Barrel of Leek": 100 }
    },
    "Monster Leek": {
        inputs: { "Refined Ultraleek": 10, "Ultraleek": 50, "Golden Leek": 500, "Leek": 10000000 },
        outputs: { "Monster Leek": 1 }
    },
    "Monster Leek XXL": {
        inputs: { "Monster Leek": 50, "Refined Ultraleek": 1000, "Ultraleek": 15000, "Atomic Leek": 1000000 },
        outputs: { "Monster Leek XXL": 1 }
    },
    "Quantum Leek": {
        inputs: { "Monster Leek XXL": 75, "Monster Leek": 10000, "Atomic Chives": 5000000, "Refined Ultraleek": 150000, "Ultraleek": 2000000 },
        outputs: { "Quantum Leek": 1 }
    }
};

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

// 최상위 -> 최하위 순서 (역산 및 처리 순서)
const resourceOrderTopDown = [
    "Quantum Leek",
    "Monster Leek XXL",
    "Monster Leek",
    "Refined Ultraleek",
    "Atomic Chives",
    "Ultraleek",
    "Golden Leek",
    "Barrel of Leek",
    "Atomic Leek",
    "Leek Cake",
    "Leek Soup",
    "Leek"
];

// 화면 표시 순서 (기초 -> 최종 자원)
const resourceOrderDisplay = [...resourceOrderTopDown].reverse();

function formatNumber(num) {
    const abs = Math.abs(num);
    if (abs >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
    if (abs >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (abs >= 1000) return (num / 1000).toFixed(2) + "K";
    if (abs >= 1) return num.toFixed(2);
    return num.toFixed(4);
}

function evaluateExpression(expression) {
    if (!expression) return 0;
    const normalized = expression.replace(/,/g, "").replace(/\s+/g, "");
    if (!normalized) return 0;

    const parts = normalized.split("+");
    if (parts.some(part => !/^\d*\.?\d+$/.test(part))) {
        return null;
    }
    return parts.reduce((sum, part) => sum + parseFloat(part), 0);
}

function getTargetRates() {
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
 * 계층적 요구량 계산 핵심 함수
 */
function calculateHierarchicalFlow() {
    const userTargets = getTargetRates();

    const requiredProduction = {}; // 각 자원의 최종 총 요구 생산량(/s)
    const consumedByUpper = {};    // 상위 티어 생산으로 인해 소모되는 양(/s)
    const byproductProduced = {};  // 하위 공정에서 부산물로 다시 되돌아오는 양(/s)

    for (const res of resourceOrderTopDown) {
        requiredProduction[res] = 0;
        consumedByUpper[res] = 0;
        byproductProduced[res] = 0;
    }

    // 최상위 자원부터 계층적으로 내려가며 소비량/부산물 역산
    for (const res of resourceOrderTopDown) {
        // 이 자원의 총 필요 생산량 = 사용자가 직접 설정한 목표량 + 상위 자원이 요청한 소비량 - 부산물 반환량
        const directTarget = userTargets[res] || 0;
        const rawNeeded = directTarget + consumedByUpper[res] - byproductProduced[res];
        
        // 생산량은 음수가 될 수 없음
        const netProductionNeeded = Math.max(0, rawNeeded);
        requiredProduction[res] = netProductionNeeded;

        const recipe = recipes[res];
        if (!recipe || netProductionNeeded === 0) continue;

        // 메인 Output 단위 기준 공정 가동 횟수(craftRate)
        const mainOutputQty = recipe.outputs[res] || 1;
        const craftRate = netProductionNeeded / mainOutputQty;

        // 1. 하위 자원 소비량 요구 전달
        for (const [inRes, qty] of Object.entries(recipe.inputs)) {
            consumedByUpper[inRes] = (consumedByUpper[inRes] || 0) + (craftRate * qty);
        }

        // 2. 부산물(Byproduct) 발생 전달 (메인 자원 제외)
        for (const [outRes, qty] of Object.entries(recipe.outputs)) {
            if (outRes !== res) {
                byproductProduced[outRes] = (byproductProduced[outRes] || 0) + (craftRate * qty);
            }
        }
    }

    renderHierarchicalResults(userTargets, consumedByUpper, byproductProduced, requiredProduction);
}

function renderHierarchicalResults(targets, upperConsumption, byproducts, finalNeeded) {
    const tbody = document.getElementById("resultBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let totalTargetCount = 0;

    for (const resource of resourceOrderDisplay) {
        const target = targets[resource] || 0;
        const upperCons = upperConsumption[resource] || 0;
        const byproduct = byproducts[resource] || 0;
        const totalNeeded = finalNeeded[resource] || 0;

        if (totalNeeded > 0) totalTargetCount++;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${resource}</strong></td>
            <td>${formatNumber(target)}/s</td>
            <td>${formatNumber(upperCons)}/s</td>
            <td style="color: #27ae60;">${byproduct > 0 ? "-" + formatNumber(byproduct) : "0"}/s</td>
            <td style="font-weight: bold; color: #2c3e50;">
                ${formatNumber(totalNeeded)}/s
            </td>
        `;

        tbody.appendChild(row);
    }

    const resultsSection = document.getElementById("resultsSection");
    if (resultsSection) resultsSection.style.display = "block";
}

document.addEventListener("DOMContentLoaded", function() {
    const calcBtn = document.getElementById("calcBtn");
    if (calcBtn) {
        calcBtn.addEventListener("click", calculateHierarchicalFlow);
    }

    document.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            calculateHierarchicalFlow();
        }
    });

    calculateHierarchicalFlow();
});
