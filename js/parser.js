/**
 * js/parser.js
 * Nhóm xử lý biểu thức toán học: Chuyển đổi cú pháp, thay thế hằng số và tính toán giá trị y.
 */

/**
 * Chuyển đổi biểu thức do người dùng nhập thành biểu thức JavaScript an toàn.
 * Hỗ trợ: sin, cos, tan, cot, pi, e, lũy thừa (^), nhân ngầm (vd: 2sin(x) -> 2*Math.sin(x)).
 * @param {string} input - Chuỗi biểu thức gốc từ người dùng (vd: "2*sin(x) + cos(2*x)")
 * @returns {string} - Chuỗi biểu thức đã biên dịch sẵn sàng để tính toán
 */
export function parseExpression(input) {
    if (!input || typeof input !== 'string') {
        throw new Error("Biểu thức không hợp lệ.");
    }

    let expr = input.trim();

    // 1. Thay thế các hằng số toán học phổ biến (phân biệt chữ hoa/thường cho pi và e)
    // Thay pi hoặc PI bằng Math.PI
    expr = expr.replace(/\bpi\b/gi, 'Math.PI');
    // Thay e (đứng độc lập) bằng Math.E
    expr = expr.replace(/\be\b/g, 'Math.E');

    // 2. Hỗ trợ hàm cot(x) vì JavaScript không có sẵn Math.cot (cot(x) = 1 / tan(x))
    expr = expr.replace(/\bcot\s*\(/g, '(1 / Math.tan(');

    // 3. Thay thế các hàm lượng giác chuẩn sang dạng Math.xxx
    expr = expr.replace(/\bsin\s*\(/g, 'Math.sin(');
    expr = expr.replace(/\bcos\s*\(/g, 'Math.cos(');
    expr = expr.replace(/\btan\s*\(/g, 'Math.tan(');

    // Xử lý riêng cho hàm sqrt nếu người dùng mở rộng sau này
    expr = expr.replace(/\bsqrt\s*\(/g, 'Math.sqrt(');

    // 4. Thay thế toán tử lũy thừa '^' thành chuẩn JavaScript '**'
    expr = expr.replace(/\^/g, '**');

    // 5. Hỗ trợ thêm dấu nhân ngầm (ví dụ: 2sin(x) thành 2*Math.sin(x), hoặc x(2) thành x*(2))
    // Số đứng liền trước hàm số hoặc biến x (vd: 2Math.sin -> 2*Math.sin, 2x -> 2*x)
    expr = expr.replace(/(\d)(\s*)(Math\.|x)/g, '$1*$3');
    
    // Đóng ngoặc liền trước biến x hoặc Math (vd: )x -> )*x)
    expr = expr.replace(/(\))(\s*)(x|Math\.)/g, '$1*$3');

    // Biến đứng trước mở ngoặc (vd: x( -> x*()
    expr = expr.replace(/(x)(\s*)(\()/g, '$1*$3');

    return expr;
}

/**
 * Tính giá trị y tại một điểm x cụ thể từ biểu thức đã biên dịch.
 * Phát hiện và xử lý các giá trị ngoại lệ (NaN, Infinity, -Infinity) phục vụ việc nhận diện tiệm cận/gián đoạn.
 * @param {string} compiledExpr - Biểu thức đã qua parseExpression
 * @param {number} x - Giá trị biến x cần tính
 * @returns {number|null} - Trả về giá trị y số thực, hoặc null nếu không xác định / ngoại lệ
 */
export function evaluateFunction(compiledExpr, x) {
    try {
        // Sử dụng Function thay cho eval trực tiếp để có phạm vi cô lập an toàn hơn
        const fn = new Function('x', `return ${compiledExpr};`);
        const y = fn(x);

        // Kiểm tra các trường hợp không xác định hoặc tiến tới vô cực (tiệm cận)
        if (isNaN(y) || !isFinite(y)) {
            return null; // Đại diện cho điểm gián đoạn hoặc không xác định
        }

        return y;
    } catch (error) {
        // Lỗi cú pháp hoặc lỗi thực thi toán học
        return null;
    }
}

/**
 * Kiểm tra tính hợp lệ sơ bộ của biểu thức nhập vào
 * @param {string} input - Biểu thức gốc
 * @returns {boolean} - True nếu hợp lệ, False nếu cú pháp sai hoàn toàn
 */
export function validateExpression(input) {
    try {
        const testExpr = parseExpression(input);
        const fn = new Function('x', `return ${testExpr};`);
        // Thử tính toán tại x = 1 để xem biểu thức có crash không
        const testVal = fn(1);
        return typeof testVal === 'number';
    } catch (e) {
        return false;
    }
}