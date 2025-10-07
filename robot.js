document.addEventListener('DOMContentLoaded', () => {
    // ===== Элементы управления =====
    const controls = {
        left: {
            speed: document.querySelector('.wheel_left_control .speed'),
            direction: document.querySelector('.wheel_left_control .direction'),
            arrowRun: document.querySelector('.arrow_wheel_run_left'),
            arrowStop: document.querySelector('.arrow_wheel_stop_left'),
            powered: false
        },
        right: {
            speed: document.querySelector('.wheel_right_control .speed'),
            direction: document.querySelector('.wheel_right_control .direction'),
            arrowRun: document.querySelector('.arrow_wheel_run_right'),
            arrowStop: document.querySelector('.arrow_wheel_stop_right'),
            powered: false
        }
    };

    const robotArrow = document.querySelector('.arrow');
    let robotAngle = 0;

    // ===== Функция обновления стрелок колес =====
    function updateWheelArrows(wheel) {
        const dir = parseInt(wheel.direction.value);

        if (dir === 1) {
            wheel.arrowRun.style.display = 'block';
            wheel.arrowStop.style.display = 'none';
        } else {
            wheel.arrowRun.style.display = 'none';
            wheel.arrowStop.style.display = 'block';
        }

        // Стрелки остаются неподвижными
        wheel.arrowRun.style.transform = `translateY(-50%) rotate(0deg)`;
        wheel.arrowStop.style.transform = `translateY(-50%) rotate(180deg)`;
    }

    function updateAllWheelArrows() {
        updateWheelArrows(controls.left);
        updateWheelArrows(controls.right);
    }

    // ===== Подписка на изменение input/select =====
    [controls.left.speed, controls.left.direction, controls.right.speed, controls.right.direction].forEach(el => {
        el.addEventListener('change', updateAllWheelArrows);
    });
    updateAllWheelArrows();

    // ===== Управление питанием колес через клавиши =====
    const keyMap = {
        left: ['ф', 'a'],
        right: ['в', 'd'],
        stopAll: ['escape']
    };

    document.addEventListener('keydown', e => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        if (keyMap.left.includes(key)) controls.left.powered = true;
        if (keyMap.right.includes(key)) controls.right.powered = true;
        if (keyMap.stopAll.includes(key)) {
            controls.left.powered = false;
            controls.right.powered = false;
        }
    });

    document.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        if (keyMap.left.includes(key)) controls.left.powered = false;
        if (keyMap.right.includes(key)) controls.right.powered = false;
    });

    // ===== Обновление стрелки направления робота =====
    function updateRobotArrow() {
        const leftSpeed = controls.left.powered ? parseFloat(controls.left.speed.value || 0) * parseInt(controls.left.direction.value) : 0;
        const rightSpeed = controls.right.powered ? parseFloat(controls.right.speed.value || 0) * parseInt(controls.right.direction.value) : 0;

        const rotationFactor = 2; // регулирует скорость вращения стрелки робота
        const rotation = (leftSpeed - rightSpeed) * rotationFactor;

        robotAngle = (robotAngle + rotation + 360) % 360;
        robotArrow.style.transform = `translate(0%, -50%) rotate(${robotAngle}deg)`;
    }
    
// ===== Сенсоры и слежение за мышкой =====
const toggleBtn = document.getElementById("toggle-sensors");
let tracking = false;

// Получаем все линии и кружки сенсоров
const lines = [];
const circles = [];
for (let i = 1; i <= 8; i++) {
    lines.push(document.querySelector(`.line${i}`));
    circles.push(document.querySelector(`.circle${i}`));
}

// Получаем все input для отображения дистанции
const sensorInputs = document.querySelectorAll(".sensor");

// Координаты платформы
let platformRect = document.querySelector(".platform").getBoundingClientRect();
let platformCenter = {
    x: platformRect.left + platformRect.width / 2,
    y: platformRect.top + platformRect.height / 2
};

// Параметры сенсоров
const SENSOR_MIN_POS = 185;  // минимальная позиция кружка
const SENSOR_MAX_POS = 485;  // максимальная позиция кружка
const LINE_LENGTH = SENSOR_MAX_POS - SENSOR_MIN_POS;
const angles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
const MIN_DIST = 10;   // минимальное значение для панели
const MAX_DIST = 80;   // максимальное значение для панели

// Параметры зоны чувствительности мыши ("пончик")
const DONUT_MIN = 330;
const DONUT_MAX = 630;

// Обновление координат платформы при изменении размера окна
window.addEventListener('resize', () => {
    platformRect = document.querySelector(".platform").getBoundingClientRect();
    platformCenter = {
        x: platformRect.left + platformRect.width / 2,
        y: platformRect.top + platformRect.height / 2
    };
});

// Включение/выключение слежения
toggleBtn.addEventListener("click", () => {
    tracking = !tracking;
    toggleBtn.textContent = tracking ? "Выключить слежение за мышкой" : "Включить слежение за мышкой";
    toggleBtn.classList.toggle("on", tracking);
    toggleBtn.classList.toggle("off", !tracking);
});

// ===== Функция вычисления позиции одного сенсора =====
function computeSensorPosition(sensorIndex, dxCenter, dyCenter) {
    const rad = angles[sensorIndex] * Math.PI / 180;
    const dxLine = Math.cos(rad);
    const dyLine = Math.sin(rad);

    let intersections = [];

    // Горизонтальная линия
    if (dyLine !== 0) {
        const yIntersect = dyCenter / dyLine;
        if (yIntersect >= DONUT_MIN && yIntersect <= DONUT_MAX) intersections.push(yIntersect);
    }

    // Вертикальная линия
    if (dxLine !== 0) {
        const xIntersect = dxCenter / dxLine;
        if (xIntersect >= DONUT_MIN && xIntersect <= DONUT_MAX) intersections.push(xIntersect);
    }

    // Минимальное пересечение или край
    let posOnDonut = intersections.length > 0 ? Math.min(...intersections) : DONUT_MAX;

    // Масштабируем в диапазон линии сенсора
    let normalized = (posOnDonut - DONUT_MIN) / (DONUT_MAX - DONUT_MIN);
    normalized = Math.min(Math.max(normalized, 0), 1);

    const sensorPos = SENSOR_MIN_POS + normalized * LINE_LENGTH;
    const sensorValue = Math.round(MIN_DIST + normalized * (MAX_DIST - MIN_DIST));

    return { sensorPos, sensorValue, active: intersections.length > 0 };
}

// ===== Обновление всех сенсоров =====
// ===== Определяем сектор по координатам курсора =====
function getCursorSector(mouseX, mouseY) {
    const dx = mouseX - platformCenter.x;
    const dy = mouseY - platformCenter.y;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI; // угол в градусах
    if (angle < 0) angle += 360;

    const sectors = [
        { min: 337.5, max: 22.5, main: [1, 8], side: [2, 7] },
        { min: 22.5, max: 67.5, main: [1, 2], side: [8, 3] },
        { min: 67.5, max: 112.5, main: [2, 3], side: [1, 4] },
        { min: 112.5, max: 157.5, main: [3, 4], side: [2, 5] },
        { min: 157.5, max: 202.5, main: [4, 5], side: [3, 6] },
        { min: 202.5, max: 247.5, main: [5, 6], side: [4, 7] },
        { min: 247.5, max: 292.5, main: [6, 7], side: [5, 8] },
        { min: 292.5, max: 337.5, main: [7, 8], side: [6, 1] }
    ];

    for (let s of sectors) {
        if (s.min > s.max) { // сектор с пересечением 0°
            if (angle >= s.min || angle <= s.max) return s;
        } else {
            if (angle >= s.min && angle <= s.max) return s;
        }
    }
    return sectors[0]; // на всякий случай
}

// ===== Обновление всех сенсоров с учётом сектора =====
function updateSensors(mouseX, mouseY) {
    const dxCenter = mouseX - platformCenter.x;
    const dyCenter = mouseY - platformCenter.y;
    const mouseDistance = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

    const mouseInsideDonut = mouseDistance >= DONUT_MIN && mouseDistance <= DONUT_MAX;

    const cursorSector = getCursorSector(mouseX, mouseY);
    const activeSensors = [...cursorSector.main, ...cursorSector.side];

    for (let i = 0; i < 8; i++) {
        let sensorPos, sensorValue;

        if (!mouseInsideDonut) {
            // Курсор вне пончика — все сенсоры на MAX_DIST
            sensorPos = SENSOR_MAX_POS;
            sensorValue = MAX_DIST;
            circles[i].style.filter = "grayscale(100%)";
        } else {
            if (activeSensors.includes(i + 1)) {
                // Активный сенсор: пересчет по вертикали/горизонтали
                const rad = angles[i] * Math.PI / 180;
                const dxLine = Math.cos(rad);
                const dyLine = Math.sin(rad);
                let posOnDonut;

                if ([8, 1, 4, 5].includes(i + 1)) {
                    // Вертикальная линия
                    posOnDonut = dxCenter / dxLine;
                } else {
                    // Горизонтальная линия
                    posOnDonut = dyCenter / dyLine;
                }

                // Проверка пересечения с границами пончика
                if (isNaN(posOnDonut) || posOnDonut < DONUT_MIN || posOnDonut > DONUT_MAX) {
                    // Нет пересечения — фиксируем на MAX_DIST
                    sensorPos = SENSOR_MAX_POS;
                    sensorValue = MAX_DIST;
                    circles[i].style.filter = "grayscale(100%)";
                } else {
                    // Ограничиваем линию рамками пончика
                    posOnDonut = Math.min(Math.max(posOnDonut, DONUT_MIN), DONUT_MAX);

                    // Масштабируем в диапазон линии сенсора
                    const normalized = (posOnDonut - DONUT_MIN) / (DONUT_MAX - DONUT_MIN);
                    sensorPos = SENSOR_MIN_POS + normalized * LINE_LENGTH;
                    sensorValue = Math.round(MIN_DIST + normalized * (MAX_DIST - MIN_DIST));
                    circles[i].style.filter = "none";
                }
            } else {
                // Неактивный сенсор внутри пончика — фиксируем на MAX_DIST
                sensorPos = SENSOR_MAX_POS;
                sensorValue = MAX_DIST;
                circles[i].style.filter = "grayscale(100%)";
            }
        }

        circles[i].style.transform = `rotate(${angles[i]}deg) translateX(${sensorPos}px)`;
        sensorInputs[i].value = sensorValue;
    }
}

const gripperBtn = document.getElementById('toggle-gripper');
const hvatOpen = document.querySelector('.hvat_rasloshen');
const hvatClosed = document.querySelector('.hvat_sloshen');

const gripperRange = document.getElementById('gripper_range');
const gripperValue = document.getElementById('gripper_value');

let gripperY = 0;           // Текущая позиция по Y
const MAX_MOVE = 300;       // Максимальное смещение по вертикали

hvatOpen.style.display = 'none';
hvatClosed.style.display = 'block';

// Переключение состояния хвата по кнопке
gripperBtn.addEventListener('click', () => {
    if (gripperBtn.classList.contains('closed')) {
        gripperBtn.classList.replace('closed', 'open');
        gripperBtn.textContent = 'Открыт';
        hvatOpen.style.display = 'block';
        hvatClosed.style.display = 'none';
    } else {
        gripperBtn.classList.replace('open', 'closed');
        gripperBtn.textContent = 'Закрыт';
        hvatOpen.style.display = 'none';
        hvatClosed.style.display = 'block';
    }
});

// Управление клавишами W/Ц (вверх) и S/Ы (вниз)
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'ц') {
        gripperY = Math.max(gripperY - 10, -MAX_MOVE); // двигаем вверх, ограничение
    } else if (key === 's' || key === 'ы') {
        gripperY = Math.min(gripperY + 10, 0);        // двигаем вниз, ограничение
    }
    updateGripperPosition();
});

function updateGripperPosition() {
    const translate = `translate(-50%, -100%) translateY(${gripperY}px)`;
    hvatOpen.style.transform = translate;
    hvatClosed.style.transform = translate;

    // Обновляем ползунок и текст с текущим процентом
    const percent = Math.round((Math.abs(gripperY) / MAX_MOVE) * 100);
    gripperRange.value = percent;
    gripperValue.textContent = percent;
}

// Управление ползунком вручную (если захочется)
gripperRange.addEventListener('input', () => {
    const percent = parseInt(gripperRange.value);
    gripperY = -Math.round((percent / 100) * MAX_MOVE);
    updateGripperPosition();
});



// ===== Слежение за движением мыши =====
document.addEventListener('mousemove', (e) => {
    if (tracking) updateSensors(e.clientX, e.clientY);
});

// ===== Главный цикл для анимации =====
function sensorLoop() {
    requestAnimationFrame(sensorLoop);
}
sensorLoop();

    // ===== Главный цикл анимации =====
    function loop() {
        updateAllWheelArrows();
        updateRobotArrow();
        requestAnimationFrame(loop);
    }
    loop();
});
