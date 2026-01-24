/**
 * MINESWEEPER - GLOBAL CONFIGURATION & CONSTANTS
 */
const MINE = '💥';
const FLAG = '🚩';
const EMPTY = '';
const NORMAL = '😄';
const LOST = '🤯';
const WIN = '😎';

// Game State Object
var gGame = {
    isOn: false,
    revealedCount: 0,
    markedCount: 0,
    secsPassed: 0,
    isFirstClick: true
};

// Global variables for board and level settings
var gMines = [];
var gTimeinterval;
var gIntervalLength = 1000;
var gLevel = { SIZE: 4, MINES: 2 };
var gSafeClicks = 0;
var gPassScore = 0; // The count needed to win (Total cells - Mines)
var gBoard = [];
var gRemianingFlags = 0;
var gLives = 0;
var gBOOM = new Audio(`../audio/boom.wav`);

/**
 * STARTING THE GAME
 */
function onInit() {
    // Reset basic counters
    gLives = 3;
    gSafeClicks = 3;
    gMines = [];
    gGame = {
        isOn: true,
        revealedCount: 0,
        markedCount: 0,
        secsPassed: 0,
        isFirstClick: true
    };

    // Calculate how many non-mine cells need to be clicked to win
    calcPass();

    // Logic initialization
    buildBoard(gLevel.SIZE);
    gRemianingFlags = gLevel.MINES;

    // UI Rendering
    renderheader(`.header-container`);
    renderBoard(gBoard, `.grid-container`);
    renderLives(gLives);
    renderSafeClicks(gSafeClicks);
    renderdiff(`.diff-container`);
}

/**
 * BOARD GENERATION
 */
function buildBoard(size) {
    gBoard = [];
    for (let i = 0; i < size; i++) {
        gBoard[i] = [];
        for (let j = 0; j < size; j++) {
            gBoard[i][j] = createCell(i, j);
        }
    }
}

function createCell(i, j) {
    return {
        location: { i: i, j: j },
        minesAroundCount: 0,
        isRevealed: false,
        isMine: false,
        isMarked: false,
    };
}

/**
 * MINE PLACEMENT & NEIGHBOR LOGIC
 */
function placeMines(mines, firstClickLoc) {
    let temp = gBoard.flat();
    shuffle(temp);

    // Remove the first clicked cell from possible mine locations (preventing instant death)
    for (let i = 0; i < temp.length; i++) {
        let cell = temp[i];
        if (cell.location.i === firstClickLoc.i && cell.location.j === firstClickLoc.j) {
            temp.splice(i, 1);
            break;
        }
    }

    // Place mines and store them in gMines for endgame reveal
    for (let i = 0; i < mines; i++) {
        temp[i].isMine = true;
        gMines.push(temp[i]);
    }
}

function setMinesNegsCount(board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            findNearMines(board[i][j]);
        }
    }
}

function findNearMines(cell) {
    let i = cell.location.i;
    let j = cell.location.j;
    let mineCount = 0;
    let neighbors = getNieghboors(i, j);

    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            if (gBoard[loc.i][loc.j].isMine) {
                mineCount++;
            }
        }
    }
    cell.minesAroundCount = mineCount;
}

/**
 * CELL REVEALING LOGIC
 */
function revealCell(elcell) {
    let location = extractCellLOcation(elcell);
    let cell = gBoard[location.i][location.j];

    // Prevent action if game is over, cell is revealed, or cell is flagged
    if (!gGame.isOn || cell.isRevealed || cell.isMarked) return;

    // First click logic: start timer and place mines
    if (gGame.isFirstClick) {
        gGame.isFirstClick = false;
        startTimer();
        placeMines(gLevel.MINES, cell.location);
        setMinesNegsCount(gBoard);
    }

    // Handle Mine hit
    if (cell.isMine) {
        gBOOM.play();
        if (gLives > 0) {
            // "Death Shield" - lose a life but keep playing
            gGame.isOn = false; // Briefly pause
            gLives--;
            renderLives(gLives);
            flashCell(elcell, MINE, EMPTY, gGame);
            return;
        } else {
            // Actual game over
            endgame(false);
            showAllMines();
            return;
        }
    }

    // Handle Number or Empty Cell
    cell.isRevealed = true;
    gGame.revealedCount++;

    if (cell.minesAroundCount !== 0) {
        elcell.innerText = cell.minesAroundCount;
    } else {
        // If empty, recursively reveal neighbors
        recRevealCells(cell);
    }

    // Apply styles
    elcell.classList.add(`num-${cell.minesAroundCount}`);
    elcell.classList.add(`revealed`);
    checkVictory();
}

/**
 * RECURSIVE REVEAL (FLOOD FILL)
 * Used when clicking an empty cell (0 mines nearby)
 */
function recRevealCells(originalCell) {
    let neighbors = getNieghboors(originalCell.location.i, originalCell.location.j);
    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            let cell = gBoard[loc.i][loc.j];
            let elcell = getCell(loc);

            // Skip if mine, flagged, or already revealed
            if (cell.isMine || cell.isMarked || cell.isRevealed) continue;

            cell.isRevealed = true;
            gGame.revealedCount++;
            elcell.classList.add(`revealed`);
            elcell.classList.add(`num-${cell.minesAroundCount}`);

            if (cell.minesAroundCount === 0) {
                recRevealCells(cell); // Keep going
            } else {
                elcell.innerText = cell.minesAroundCount;
            }
        }
    }
}

/**
 * FLAG LOGIC
 */
function flagCell(event, elcell) {
    if (event) event.preventDefault(); // Prevent right-click menu
    if (!gGame.isOn) return;

    let location = extractCellLOcation(elcell);
    let cell = gBoard[location.i][location.j];

    if (cell.isRevealed) return;

    if (cell.isMarked) {
        cell.isMarked = false;
        renderCell(cell.location, EMPTY);
        gRemianingFlags++;
    } else if (gRemianingFlags > 0) {
        gRemianingFlags--;
        cell.isMarked = true;
        renderCell(cell.location, FLAG);
    }

    renderFlag(gRemianingFlags);
}

/**
 * GAME FLOW & ENDING
 */
function endgame(isWin) {
    gGame.isOn = false;
    clearInterval(gTimeinterval);
    renderStatus(isWin ? WIN : LOST);
}

function checkVictory() {
    if (gGame.revealedCount === gPassScore) {
        endgame(true);
    }
}

function calcPass() {
    gPassScore = gLevel.SIZE * gLevel.SIZE - gLevel.MINES;
}

function restart() {
    clearInterval(gTimeinterval);
    onInit();
}

/**
 * TIMER LOGIC
 */
function startTimer() {
    gTimeinterval = setInterval(runTimer, gIntervalLength);
}

function runTimer() {
    if (!gGame.isOn) return;
    gGame.secsPassed++;
    updateTimer(gGame.secsPassed);
}

/**
 * FEATURES & UTILITIES
 */
function showAllMines() {
    for (let mine of gMines) {
        renderCell(mine.location, MINE);
        let elCell = getCell(mine.location);
        elCell.classList.add('revealed');
    }
}

function onSafeClick() {
    if (gSafeClicks <= 0 || !gGame.isOn) return;

    gSafeClicks--;
    let arr = gBoard.flat();
    shuffle(arr);

    // Find a random safe cell that isn't revealed or mine
    for (let cell of arr) {
        if (!cell.isMine && !cell.isRevealed) {
            let elCell = getCell(cell.location);
            elCell.classList.add('flash');
            setTimeout(() => { elCell.classList.remove('flash'); }, 1500);
            renderSafeClicks(gSafeClicks);
            return;
        }
    }
}

function changeDiff(size, mineCount) {
    gLevel.SIZE = size;
    gLevel.MINES = mineCount;
    restart();
}

/**
 * MATH & NAVIGATION UTILS
 */
function getNieghboors(i, j) {
    return [
        { i: i - 1, j: j - 1 }, { i: i - 1, j: j }, { i: i - 1, j: j + 1 },
        { i: i, j: j - 1 }, { i: i, j: j + 1 },
        { i: i + 1, j: j - 1 }, { i: i + 1, j: j }, { i: i + 1, j: j + 1 }
    ];
}

function isOnBoardLocation(location) {
    return location.i >= 0 && location.i < gBoard.length &&
        location.j >= 0 && location.j < gBoard[0].length;
}

function shuffle(items) {
    for (var i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }
    return items;
}

function extractCellLOcation(elcell) {
    let str = elcell.classList[1]; // assumes cell-i-j is the second class
    let arr = str.split('-');
    return { i: +arr[1], j: +arr[2] };
}