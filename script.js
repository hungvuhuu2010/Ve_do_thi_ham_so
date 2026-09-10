/**
 * script.js (Phiên bản giao diện Tabs hiện đại)
 */

import { parseExpression, validateExpression } from './js/parser.js';
import { createCoordinateSystem, drawGrid, drawAxes, drawAsymptotes, drawGraphCurve } from './js/renderer.js';
import { GraphAnimator } from './js/animation.js';
import { ViewportInteractions, exportToPNG } from './js/interactions.js';

document.addEventListener('DOMContentLoaded', () => {
    const svgElement = document.getElementById('coordinate-system');
    const tabsList = document.getElementById('tabs-list');
    const btnAddTab = document.getElementById('btn-add-tab');
    const cardsContainer = document.getElementById('function-cards-container');
    const oxUnitSelect = document.getElementById('ox-unit-select');

    const btnDrawAll = document.getElementById('btn-draw-all');
    const btnExport = document.getElementById('btn-export');

    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnResetView = document.getElementById('btn-reset-view');
    const errorBanner = document.getElementById('error-message');
    const cursorCoordsDiv = document.getElementById('cursor-coords');

    const COLOR_PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

    // Mảng lưu danh sách các hàm số
    let functionsData = [
        { id: 1, expr: 'sin(x)', start: '-2*pi', end: '2*pi', color: COLOR_PALETTE[0] }
    ];
    let activeTabIndex = 0;

    const viewState = {
        width: svgElement.clientWidth || 800,
        height: svgElement.clientHeight || 600,
        centerX: 0,
        centerY: 0,
        scale: 60
    };

    let svgGroups = createCoordinateSystem(svgElement);
    const animator = new GraphAnimator(svgGroups.graphGroup, svgGroups.animGroup);

    // Render giao diện Tabs và Card đang active
    function renderTabsAndCard() {
        // 1. Render danh sách Tab phía trên
        tabsList.innerHTML = '';
        functionsData.forEach((fn, index) => {
            const tab = document.createElement('div');
            tab.className = `function-tab ${index === activeTabIndex ? 'active' : ''}`;
            tab.style.borderTopColor = fn.color;
            tab.innerHTML = `<span>Hàm số ${index + 1}</span>`;
            
            tab.addEventListener('click', () => {
                activeTabIndex = index;
                renderTabsAndCard();
            });
            tabsList.appendChild(tab);
        });

        // 2. Render khung nhập liệu của Tab đang active (Giống ảnh mẫu)
        const activeFn = functionsData[activeTabIndex];
        cardsContainer.innerHTML = `
            <div class="function-card-box" style="border-left: 4px solid ${activeFn.color};">
                <div class="input-group">
                    <label>Biểu thức hàm số:</label>
                    <div class="expression-wrapper">
                        <span>y =</span>
                        <input type="text" id="active-expr" value="${activeFn.expr}" placeholder="vd: sin(x)">
                    </div>
                </div>

                <div class="input-row">
                    <div class="input-group">
                        <label>Cận a:</label>
                        <input type="text" id="active-start" value="${activeFn.start}">
                    </div>
                    <div class="input-group">
                        <label>Cận b:</label>
                        <input type="text" id="active-end" value="${activeFn.end}">
                    </div>
                </div>

                <!-- Cụm nút điều khiển riêng cho Tab hiện tại -->
                <div class="tab-action-group">
                    <button id="btn-draw-tab" class="btn btn-primary">
                        <i class="fa-solid fa-play"></i> Vẽ hàm này
                    </button>
                    <div class="tab-anim-controls" id="tab-anim-controls" style="display: none;">
                        <button id="btn-pause-tab" class="btn btn-warning" style="flex:1;">
                            <i class="fa-solid fa-pause"></i> Tạm dừng
                        </button>
                        <button id="btn-reset-tab" class="btn btn-secondary" style="flex:1;">
                            <i class="fa-solid fa-rotate-right"></i> Vẽ lại
                        </button>
                    </div>
                    ${functionsData.length > 1 ? `<button id="btn-remove-tab" class="btn btn-secondary" style="background:#fee2e2; color:#dc2626;"><i class="fa-solid fa-trash"></i> Xóa hàm này</button>` : ''}
                </div>
            </div>
        `;

        // Gắn sự kiện thay đổi dữ liệu thời gian thực cho input
        document.getElementById('active-expr').addEventListener('input', (e) => {
            functionsData[activeTabIndex].expr = e.target.value;
        });
        document.getElementById('active-start').addEventListener('input', (e) => {
            functionsData[activeTabIndex].start = e.target.value;
        });
        document.getElementById('active-end').addEventListener('input', (e) => {
            functionsData[activeTabIndex].end = e.target.value;
        });

        // Gắn sự kiện nút vẽ riêng cho tab active
        document.getElementById('btn-draw-tab').addEventListener('click', () => {
            drawSingleFunction(activeTabIndex);
        });

        // Gắn sự kiện xóa tab nếu có từ 2 tab trở lên
        const removeBtn = document.getElementById('btn-remove-tab');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                functionsData.splice(activeTabIndex, 1);
                if (activeTabIndex >= functionsData.length) activeTabIndex = functionsData.length - 1;
                renderTabsAndCard();
                updateScene();
            });
        }
    }

    // Nút (+) Thêm tab mới
    btnAddTab.addEventListener('click', () => {
        if (functionsData.length >= COLOR_PALETTE.length) {
            showError("Đã đạt giới hạn tối đa số lượng hàm số.");
            return;
        }
        functionsData.push({
            id: Date.now(),
            expr: 'cos(x)',
            start: '-2*pi',
            end: '2*pi',
            color: COLOR_PALETTE[functionsData.length % COLOR_PALETTE.length]
        });
        activeTabIndex = functionsData.length - 1;
        renderTabsAndCard();
    });

    const updateScene = () => {
        const unitMode = oxUnitSelect.value;
        drawGrid(svgGroups.gridGroup, viewState, unitMode);
        drawAxes(svgGroups.axesGroup, viewState, unitMode);

        if (!animator.isPlaying) {
            svgGroups.graphGroup.innerHTML = '';
            svgGroups.asymptoteGroup.innerHTML = '';

            functionsData.forEach(fn => {
                if (fn.expr && validateExpression(fn.expr)) {
                    try {
                        const compiled = parseExpression(fn.expr);
                        const start = eval(parseExpression(fn.start));
                        const end = eval(parseExpression(fn.end));
                        drawAsymptotes(svgGroups.asymptoteGroup, compiled, { start, end }, viewState);
                        drawGraphCurve(svgGroups.graphGroup, compiled, { start, end }, viewState, fn.color);
                    } catch (e) {}
                }
            });
        }
    };

    const viewport = new ViewportInteractions(svgElement, viewState, updateScene);
    renderTabsAndCard();
    updateScene();

    // Hàm vẽ riêng cho 1 hàm số (Active Tab)
    // Hàm vẽ riêng cho 1 hàm số (Active Tab) nhưng KHÔNG xóa các đồ thị khác
    // Hàm vẽ riêng cho 1 hàm số (Active Tab) và vẽ chồng thêm (appendMode = true)
    function drawSingleFunction(index) {
        hideError();
        const fn = functionsData[index];
        const unitMode = oxUnitSelect.value;

        if (!validateExpression(fn.expr)) {
            showError(`Biểu thức ở Hàm số ${index + 1} không hợp lệ.`);
            return;
        }

        let start, end;
        try {
            start = eval(parseExpression(fn.start));
            end = eval(parseExpression(fn.end));
        } catch (e) {
            showError(`Cận ở Hàm số ${index + 1} không hợp lệ.`);
            return;
        }

        if (start >= end) {
            showError("Cận đầu phải nhỏ hơn cận cuối.");
            return;
        }

        try {
            const compiledExpr = parseExpression(fn.expr);
            
            // Vẽ lại lưới và trục tọa độ (giữ nguyên khung nhìn)
            drawGrid(svgGroups.gridGroup, viewState, unitMode);
            drawAxes(svgGroups.axesGroup, viewState, unitMode);

            // Vẽ thêm tiệm cận cho hàm này (vẫn giữ các tiệm cận cũ)
            drawAsymptotes(svgGroups.asymptoteGroup, compiledExpr, { start, end }, viewState);

            // Hiển thị cụm nút điều khiển animation của tab
            document.getElementById('tab-anim-controls').style.display = 'flex';

            // Gọi animator với tham số true (appendMode) để vẽ chồng thêm mà không xóa các đồ thị khác
            animator.start([{ compiledExpr, start, end, color: fn.color }], viewState, () => {
                // Hoàn thành animation riêng của tab này
            });

        } catch (err) {
            showError("Lỗi: " + err.message);
        }
    }

    // Nút "Vẽ tất cả đồ thị"
    btnDrawAll.addEventListener('click', () => {
        hideError();
        const unitMode = oxUnitSelect.value;
        const listToDraw = [];

        for (let i = 0; i < functionsData.length; i++) {
            const fn = functionsData[i];
            if (!validateExpression(fn.expr)) {
                showError(`Hàm số ${i + 1} không hợp lệ.`);
                return;
            }
            try {
                const compiledExpr = parseExpression(fn.expr);
                const start = eval(parseExpression(fn.start));
                const end = eval(parseExpression(fn.end));
                listToDraw.push({ compiledExpr, start, end, color: fn.color });
            } catch (e) {
                showError(`Lỗi tính toán ở Hàm số ${i + 1}.`);
                return;
            }
        }

        drawGrid(svgGroups.gridGroup, viewState, unitMode);
        drawAxes(svgGroups.axesGroup, viewState, unitMode);
        svgGroups.asymptoteGroup.innerHTML = '';
        listToDraw.forEach(fn => {
            drawAsymptotes(svgGroups.asymptoteGroup, fn.compiledExpr, { start: fn.start, end: fn.end }, viewState);
        });

        animator.start(listToDraw, viewState, () => {});
    });

    btnExport.addEventListener('click', () => exportToPNG(svgElement, 'do-thi-luong-giac.png'));
    btnZoomIn.addEventListener('click', () => viewport.zoomAt(1.2));
    btnZoomOut.addEventListener('click', () => viewport.zoomAt(0.8));
    btnResetView.addEventListener('click', () => viewport.reset(60));
    oxUnitSelect.addEventListener('change', updateScene);

    svgElement.addEventListener('mousemove', (e) => {
        const rect = svgElement.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        import('./js/coordinate.js').then(mod => {
            const m = mod.svgToMath(px, py, viewState);
            cursorCoordsDiv.textContent = `x: ${m.x.toFixed(2)}, y: ${m.y.toFixed(2)}`;
        });
    });

    function showError(msg) {
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
    }
    function hideError() {
        errorBanner.textContent = '';
        errorBanner.style.display = 'none';
    }

    setTimeout(() => {
        drawSingleFunction(0);
    }, 100);
});