/**
 * js/renderer.js
 * Nhóm vẽ giao diện & hệ tọa độ: Khởi tạo SVG, vẽ lưới, trục tọa độ với nhãn π, tiệm cận và đồ thị.
 */

import { mathToSvg } from './coordinate.js';
import { evaluateFunction } from './parser.js';

/**
 * Khởi tạo cấu trúc các nhóm thẻ <g> bên trong thẻ SVG để phân tầng thứ tự hiển thị.
 * Thứ tự từ dưới lên: Lưới -> Tiệm cận -> Đồ thị -> Trục tọa độ & Nhãn -> Điểm động.
 * @param {SVGElement} svgElement - Phần tử SVG trên DOM
 * @returns {Object} - Các đối tượng nhóm SVG <g>
 */
export function createCoordinateSystem(svgElement) {
    // Xóa nội dung cũ nếu có
    svgElement.innerHTML = '';

    // Tạo defs cho mũi tên trục tọa độ
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrow-x" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/>
        </marker>
        <marker id="arrow-y" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b"/>
        </marker>
    `;
    svgElement.appendChild(defs);

    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'grid-group');

    const asymptoteGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    asymptoteGroup.setAttribute('class', 'asymptote-group');

    const graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    graphGroup.setAttribute('class', 'graph-group');

    const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    axesGroup.setAttribute('class', 'axes-group');

    const animGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    animGroup.setAttribute('class', 'animation-group');

    svgElement.appendChild(gridGroup);
    svgElement.appendChild(asymptoteGroup);
    svgElement.appendChild(graphGroup);
    svgElement.appendChild(axesGroup);
    svgElement.appendChild(animGroup);

    return { gridGroup, asymptoteGroup, graphGroup, axesGroup, animGroup };
}

/**
 * Định dạng giá trị số thành chuỗi ký hiệu toán học chứa π (ví dụ: π/2, -3π/4, π, 0...)
 * @param {number} val - Giá trị số thực
 * @param {string} unitMode - Đơn vị chia ('pi', 'pi/2', 'pi/4')
 * @returns {string} - Chuỗi hiển thị thân thiện
 */
function formatPiLabel(val, unitMode) {
    if (Math.abs(val) < 1e-5) return '0';

    const ratio = val / (Math.PI / 4);
    const k = Math.round(ratio);

    if (Math.abs(ratio - k) < 1e-3) {
        if (k === 0) return '0';
        if (k === 4) return 'π';
        if (k === -4) return '-π';
        if (k === 2) return 'π/2';
        if (k === -2) return '-π/2';
        if (k === 1) return 'π/4';
        if (k === -1) return '-π/4';

        if (k % 4 === 0) return `${k / 4}π`;
        if (k % 2 === 0) return `${k / 2}π/2`;
        return `${k}π/4`;
    }

    return val.toFixed(1);
}

/**
 * Vẽ lưới tọa độ ngang và dọc
 * @param {SVGElement} group - Nhóm SVG chứa lưới
 * @param {Object} viewState - Khung nhìn { width, height, centerX, centerY, scale }
 * @param {string} unitMode - Đơn vị trục Ox ('pi', 'pi/2', 'pi/4')
 */
export function drawGrid(group, viewState, unitMode) {
    group.innerHTML = '';
    const { width, height, centerX, centerY, scale } = viewState;

    let xStep = Math.PI;
	if (unitMode === '1') xStep = 1;
    if (unitMode === 'pi/2') xStep = Math.PI / 2;
    if (unitMode === 'pi/4') xStep = Math.PI / 4;

    const minMathX = (-width / 2 - centerX) / scale;
    const maxMathX = (width / 2 - centerX) / scale;

    const startK = Math.floor(minMathX / xStep);
    const endK = Math.ceil(maxMathX / xStep);

    for (let k = startK; k <= endK; k++) {
        const mathX = k * xStep;
        const { x: pixelX } = mathToSvg(mathX, 0, viewState);

        if (pixelX >= 0 && pixelX <= width) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pixelX);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', pixelX);
            line.setAttribute('y2', height);
            line.setAttribute('stroke', Math.abs(mathX) < 1e-5 ? '#94a3b8' : '#e2e8f0');
            line.setAttribute('stroke-width', Math.abs(mathX) < 1e-5 ? '2' : '1');
            if (Math.abs(mathX) >= 1e-5) {
                line.setAttribute('stroke-dasharray', '4 4');
            }
            group.appendChild(line);
        }
    }

    const yStep = scale < 40 ? 2 : 1;
    const minMathY = (-height / 2 - centerY) / scale;
    const maxMathY = (height / 2 - centerY) / scale;

    const startY = Math.floor(minMathY / yStep) * yStep;
    const endY = Math.ceil(maxMathY / yStep) * yStep;

    for (let my = startY; my <= endY; my++) {
        if (Math.abs(my) < 1e-5) continue;
        const { y: pixelY } = mathToSvg(0, my, viewState);

        if (pixelY >= 0 && pixelY <= height) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', pixelY);
            line.setAttribute('x2', width);
            line.setAttribute('y2', pixelY);
            line.setAttribute('stroke', '#e2e8f0');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '4 4');
            group.appendChild(line);
        }
    }
}

/**
 * Vẽ trục tọa độ Ox, Oy, mũi tên và các nhãn số
 * @param {SVGElement} group - Nhóm SVG chứa trục
 * @param {Object} viewState - Khung nhìn
 * @param {string} unitMode - Đơn vị trục Ox
 */
/**
 * Vẽ trục tọa độ Ox, Oy, mũi tên và các nhãn số (dạng phân thức toán học)
 * @param {SVGElement} group - Nhóm SVG chứa trục
 * @param {Object} viewState - Khung nhìn
 * @param {string} unitMode - Đơn vị trục Ox
 */
export function drawAxes(group, viewState, unitMode) {
    group.innerHTML = '';
    const { width, height, centerX, centerY, scale } = viewState;
    const origin = mathToSvg(0, 0, viewState);

    // Trục Ox
    const axisX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axisX.setAttribute('x1', 0);
    axisX.setAttribute('y1', origin.y);
    axisX.setAttribute('x2', width);
    axisX.setAttribute('y2', origin.y);
    axisX.setAttribute('stroke', '#475569');
    axisX.setAttribute('stroke-width', '2');
    axisX.setAttribute('marker-end', 'url(#arrow-x)');
    group.appendChild(axisX);

    // Trục Oy
    const axisY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axisY.setAttribute('x1', origin.x);
    axisY.setAttribute('y1', height);
    axisY.setAttribute('x2', origin.x);
    axisY.setAttribute('y2', 0);
    axisY.setAttribute('stroke', '#475569');
    axisY.setAttribute('stroke-width', '2');
    axisY.setAttribute('marker-end', 'url(#arrow-y)');
    group.appendChild(axisY);

    // Nhãn chữ x
    const labelX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelX.setAttribute('x', width - 15);
    labelX.setAttribute('y', origin.y - 10);
    labelX.setAttribute('fill', '#475569');
    labelX.setAttribute('font-size', '20');
    labelX.setAttribute('font-weight', 'bold');
    labelX.textContent = 'x';
    group.appendChild(labelX);

    // Nhãn chữ y
    const labelY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelY.setAttribute('x', origin.x + 10);
    labelY.setAttribute('y', 20);
    labelY.setAttribute('fill', '#475569');
    labelY.setAttribute('font-size', '20');
    labelY.setAttribute('font-weight', 'bold');
    labelY.textContent = 'y';
    group.appendChild(labelY);

    // Xác định bước nhảy chia vạch trên Ox
    let xStep = Math.PI;
	if (unitMode === '1') xStep = 1;
    if (unitMode === 'pi/2') xStep = Math.PI / 2;
    if (unitMode === 'pi/4') xStep = Math.PI / 4;

    const minMathX = (-width / 2 - centerX) / scale;
    const maxMathX = (width / 2 - centerX) / scale;
    const startK = Math.floor(minMathX / xStep);
    const endK = Math.ceil(maxMathX / xStep);

    for (let k = startK; k <= endK; k++) {
        const mathX = k * xStep;
        if (Math.abs(mathX) < 1e-5) continue; // Bỏ qua gốc 0
        const { x: pixelX } = mathToSvg(mathX, 0, viewState);

        if (pixelX >= 25 && pixelX <= width - 25) {
            // Vạch chia nhỏ trên Ox
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', pixelX);
            tick.setAttribute('y1', origin.y - 5);
            tick.setAttribute('x2', pixelX);
            tick.setAttribute('y2', origin.y + 5);
            tick.setAttribute('stroke', '#475569');
            tick.setAttribute('stroke-width', '1.5');
            group.appendChild(tick);

            // NẾU CHỌN ĐƠN VỊ LÀ SỐ NGUYÊN (1, 2, 3...)
            if (unitMode === '1') {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', pixelX);
                text.setAttribute('y', origin.y + 20);
                text.setAttribute('fill', '#64748b');
                text.setAttribute('font-size', '16');
                text.setAttribute('text-anchor', 'middle');
                text.textContent = Math.round(mathX);
                group.appendChild(text);
            } 
            // NẾU CHỌN ĐƠN VỊ LÀ CÁC MỐC PI (π, π/2, π/4...)
            else {
                const ratio = mathX / (Math.PI / 4);
                const stepK = Math.round(ratio);

                if (Math.abs(ratio - stepK) < 1e-3) {
                    if (stepK % 4 === 0) {
                        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        text.setAttribute('x', pixelX);
                        text.setAttribute('y', origin.y + 20);
                        text.setAttribute('fill', '#64748b');
                        text.setAttribute('font-size', '20');
                        text.setAttribute('text-anchor', 'middle');
                        const val = stepK / 4;
                        text.textContent = val === 1 ? 'π' : val === -1 ? '-π' : `${val}π`;
                        group.appendChild(text);
                    } else {
                        let num = stepK;
                        let den = 4;
                        if (num % 2 === 0 && den % 2 === 0) {
                            num /= 2;
                            den /= 2;
                        }

                        const fracGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                        fracGroup.setAttribute('transform', `translate(${pixelX}, ${origin.y + 16})`);

                        // Tử số
                        const textTop = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textTop.setAttribute('x', '0');
                        textTop.setAttribute('y', '-3');
                        textTop.setAttribute('fill', '#64748b');
                        textTop.setAttribute('font-size', '16');
                        textTop.setAttribute('text-anchor', 'middle');
                        textTop.textContent = Math.abs(num) === 1 ? (num < 0 ? '-π' : 'π') : `${num}π`;

                        // Gạch phân số
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', '-9');
                        line.setAttribute('y1', '0');
                        line.setAttribute('x2', '9');
                        line.setAttribute('y2', '0');
                        line.setAttribute('stroke', '#64748b');
                        line.setAttribute('stroke-width', '1');

                        // Mẫu số
                        const textBottom = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textBottom.setAttribute('x', '0');
                        textBottom.setAttribute('y', '10');
                        textBottom.setAttribute('fill', '#64748b');
                        textBottom.setAttribute('font-size', '16');
                        textBottom.setAttribute('text-anchor', 'middle');
                        textBottom.textContent = `${den}`;

                        fracGroup.appendChild(textTop);
                        fracGroup.appendChild(line);
                        fracGroup.appendChild(textBottom);
                        group.appendChild(fracGroup);
                    }
                }
            }
        }
    }
}

/**
 * Tự động phát hiện và vẽ đường tiệm cận đứng đứt nét (cho tan, cot, 1/cos...)
 * @param {SVGElement} group - Nhóm SVG chứa tiệm cận
 * @param {string} compiledExpr - Biểu thức đã biên dịch
 * @param {Object} domain - Khoảng [a, b]
 * @param {Object} viewState - Khung nhìn
 */
export function drawAsymptotes(group, compiledExpr, domain, viewState) {
    group.innerHTML = '';
    const { height } = viewState;
    const { start, end } = domain;

    const step = 0.01;
    let prevY = evaluateFunction(compiledExpr, start);

    for (let x = start + step; x <= end; x += step) {
        const currY = evaluateFunction(compiledExpr, x);

        if (currY === null || prevY === null || Math.abs(currY - prevY) > 1000) {
            const asymptoteX = x - step / 2;
            const { x: pixelX } = mathToSvg(asymptoteX, 0, viewState);

            if (pixelX >= 0 && pixelX <= viewState.width) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', pixelX);
                line.setAttribute('y1', 0);
                line.setAttribute('x2', pixelX);
                line.setAttribute('y2', height);
                line.setAttribute('stroke', '#ef4444');
                line.setAttribute('stroke-width', '1.2');
                line.setAttribute('stroke-dasharray', '5 5');
                group.appendChild(line);
            }
        }
        prevY = currY;
    }
}

/**
 * Vẽ toàn bộ đường cong đồ thị tĩnh
 * @param {SVGElement} group - Nhóm SVG chứa đồ thị
 * @param {string} compiledExpr - Biểu thức đã biên dịch
 * @param {Object} domain - Khoảng [a, b]
 * @param {Object} viewState - Khung nhìn
 */
export function drawGraphCurve(group, compiledExpr, domain, viewState, color = '#2563eb') {
    const { start, end } = domain;
    const step = 0.02;

    let pathData = '';
    let isDrawing = false;

    for (let x = start; x <= end; x += step) {
        const y = evaluateFunction(compiledExpr, x);

        if (y === null || Math.abs(y) > 100) {
            isDrawing = false;
            continue;
        }

        const { x: px, y: py } = mathToSvg(x, y, viewState);

        if (py < -5000 || py > 5000) {
            isDrawing = false;
            continue;
        }

        if (!isDrawing) {
            pathData += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
            isDrawing = true;
        } else {
            pathData += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
        }
    }

    if (pathData) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
        group.appendChild(path);
    }
}
