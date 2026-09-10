/**
 * js/animation.js
 * Nhóm hiệu ứng mô phỏng: Quản lý vòng lặp vẽ nhiều đồ thị đồng thời.
 */

import { mathToSvg } from './coordinate.js';
import { evaluateFunction } from './parser.js';

export class GraphAnimator {
    constructor(graphGroup, animGroup) {
        this.graphGroup = graphGroup;
        this.animGroup = animGroup;
        this.animationId = null;
        this.isPlaying = false;
        this.isPaused = false;
    }

    start(functionsArray, viewState, onComplete, appendMode = false) {
        this.stop();
        this.viewState = viewState;
        this.onComplete = onComplete;

        // Nếu KHÔNG ở chế độ append (vẽ thêm), thì mới xóa sạch group cũ
        if (!appendMode) {
            this.graphGroup.innerHTML = '';
            this.animGroup.innerHTML = '';
            this.functions = [];
        }

        // Đảm bảo functionsArray là mảng
        const newFunctions = functionsArray; 

        let globalStart = Infinity;
        let globalEnd = -Infinity;

        newFunctions.forEach(fn => {
            if (fn.start < globalStart) globalStart = fn.start;
            if (fn.end > globalEnd) globalEnd = fn.end;

            fn.pathData = '';
            fn.isDrawing = false;
            fn.currentX = fn.start;

            // Tạo thẻ path cho từng hàm mới
            fn.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            fn.pathElement.setAttribute('fill', 'none');
            fn.pathElement.setAttribute('stroke', fn.color);
            fn.pathElement.setAttribute('stroke-width', '2.5');
            this.graphGroup.appendChild(fn.pathElement);

            // Tạo điểm tròn chạy cho từng hàm mới
            fn.dotElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            fn.dotElement.setAttribute('r', '5');
            fn.dotElement.setAttribute('fill', fn.color);
            fn.dotElement.setAttribute('stroke', '#ffffff');
            fn.dotElement.setAttribute('stroke-width', '2');
            this.animGroup.appendChild(fn.dotElement);
        });

        // Nếu dùng appendMode, ta gộp thêm vào danh sách quản lý chung của animator
        if (appendMode && this.functions) {
            this.functions.push(...newFunctions);
        } else {
            this.functions = newFunctions;
        }

        this.stepSize = 0.03;
        this.isPlaying = true;
        this.isPaused = false;
        this._loop();
    }

    _loop() {
        if (!this.isPlaying || this.isPaused) return;

        const stepsPerFrame = 3;
        for (let s = 0; s < stepsPerFrame; s++) {
            let allFinished = true;

            this.functions.forEach(fn => {
                if (fn.currentX <= fn.end) {
                    allFinished = false;
                    const y = evaluateFunction(fn.compiledExpr, fn.currentX);

                    if (y === null || Math.abs(y) > 100) {
                        fn.isDrawing = false;
                        fn.dotElement.setAttribute('opacity', '0');
                    } else {
                        const { x: px, y: py } = mathToSvg(fn.currentX, y, this.viewState);
                        if (py >= -5000 && py <= 5000) {
                            if (!fn.isDrawing) {
                                fn.pathData += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
                                fn.isDrawing = true;
                            } else {
                                fn.pathData += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
                            }
                            fn.dotElement.setAttribute('cx', px);
                            fn.dotElement.setAttribute('cy', py);
                            fn.dotElement.setAttribute('opacity', '1');
                        } else {
                            fn.isDrawing = false;
                            fn.dotElement.setAttribute('opacity', '0');
                        }
                    }
                    fn.currentX += this.stepSize;
                } else {
                    fn.dotElement.setAttribute('opacity', '0');
                }
            });

            this.functions.forEach(fn => {
                if (fn.pathElement) {
                    fn.pathElement.setAttribute('d', fn.pathData);
                }
            });

            if (allFinished) {
                this.stop();
                if (this.onComplete) this.onComplete();
                return;
            }
        }

        this.animationId = requestAnimationFrame(() => this._loop());
    }

    pause() {
        this.isPaused = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    resume() {
        if (this.isPlaying && this.isPaused) {
            this.isPaused = false;
            this._loop();
        }
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.functions) {
            this.functions.forEach(fn => {
                if (fn.dotElement) fn.dotElement.setAttribute('opacity', '0');
            });
        }
    }
}