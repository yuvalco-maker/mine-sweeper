/**
 * MINESWEEPER - MAIN GAME LOGIC
 */

// --- CONSTANTS ---
const MINE = '💥'
const FLAG = `🚩`
const EMPTY = ``
const NORMAL = `😄`
const LOST = `🤯`
const WIN = `😎`

// --- GLOBAL STATE ---
var gGame = {
    isOn: false,
    revealedCount: 0,
    markedCount: 0,
    secsPassed: 0,
    isFirstClick: true
}

var gMines = []            // Stores locations of all mines
var gTimeinterval;         // Holds the setInterval reference
var gIntervalLength = 1000 // 1 second intervals
var gLevel = {             // Default difficulty (Beginner)
    SIZE: 4,
    MINES: 2,
}
var gSafeClicks = 0        // Counter for remaining safe-click hints
var gPassScore = 0         // Target revealedCount to trigger a win
var gBoard = []            // The 2D logical matrix
var gRemianingFlags = 0    // Flags left to place
var gLives = 0             // Remaining lives
var gBOOM = new Audio(`../audio/boom.wav`) // Sound effect

/**
 * Initialization: Sets up a fresh game state
 */
function onInit() {
    gLives = 3
    gSafeClicks = 3
    gMines = []
    gGame = {
        isOn: true,
        revealedCount: 0,
        markedCount: 0,
        secsPassed: 0,
        isFirstClick: true
    };
    gBoard = [];
    gRemianingFlags = gLevel.MINES;

    calcPass(); // Determine win condition score
    buildBoard(gLevel.SIZE); // Create the matrix

    // Initial Render
    renderheader(`.header-container`)
    renderBoard(gBoard, `.grid-container`)
    renderLives(gLives)
    renderSafeClicks(gSafeClicks)
    renderdiff(`.diff-container`)
}

/**
 * Creates a single cell object with default properties
 */
function createCell(i, j) {
    return {
        location: { i: i, j: j },
        minesAroundCount: 0,
        isRevealed: false,
        isMine: false,
        isMarked: false,
    }
}

/**
 * Builds the 2D array matrix based on level size
 */
function buildBoard(size) {
    gBoard = []
    for (let i = 0; i < size; i++) {
        gBoard[i] = []
        for (let j = 0; j < size; j++) {
            gBoard[i][j] = createCell(i, j)
        }
    }
}

/**
 * Randomly places mines on the board, avoiding the first clicked cell
 */
function placeMines(mines, loc) {
    let temp = gBoard.flat()
    shuffle(temp)

    // Remove the first-clicked cell from the shuffled pool to ensure it's safe
    for (let i = 0; i < temp.length; i++) {
        let cell = temp[i]
        if (cell.location.i === loc.i && cell.location.j === loc.j) {
            temp.splice(i, 1)
            break;
        }
    }

    // Assign mines to the first 'n' cells in the shuffled array
    for (let i = 0; i < mines; i++) {
        temp[i].isMine = true
        gMines.push(temp[i])
    }
}

/**
 * Iterates through the whole board to calculate neighbor mine counts
 */
function setMinesNegsCount(board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            findNearMines(board[i][j])
        }
    }
}

/**
 * Counts mines in the 8 neighboring cells of a specific cell
 */
function findNearMines(cell) {
    let i = cell.location.i
    let j = cell.location.j
    let mineCount = 0
    let neighbors = getNieghboors(i, j)
    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            if (gBoard[loc.i][loc.j].isMine) {
                mineCount++
            }
        }
    }
    cell.minesAroundCount = mineCount
}

/**
 * Main click handler: Handles revealing logic, mine hits, and first-click setup
 */
function revealCell(elcell) {
    let location = extractCellLOcation(elcell)
    let cell = gBoard[location.i][location.j]

    // Block interaction if game is over, cell is revealed, or cell is flagged
    if (!gGame.isOn || cell.isRevealed || cell.isMarked) return;

    // Trigger mine placement on the very first click
    if (gGame.isFirstClick) {
        gGame.isFirstClick = false
        startTimer()
        placeMines(gLevel.MINES, cell.location)
        setMinesNegsCount(gBoard)
    }

    // Handle Mine Hit
    if (cell.isMine) {
        gBOOM.play()
        if (gLives > 0) {
            // "Life System": Pause game, deduct life, and show mine briefly
            gGame.isOn = false
            gLives--
            renderLives(gLives)
            flashCell(elcell, MINE, EMPTY, gGame)
            return
        } else {
            // Out of lives: Game Over
            endgame(false)
            showAllMines()
            return
        }
    } else if (cell.minesAroundCount != 0) {
        // Cell has mine neighbors: Reveal normally
        cell.isRevealed = true
        gGame.revealedCount++
        elcell.innerText = cell.minesAroundCount
    } else {
        // Empty cell: Trigger recursive expansion
        cell.isRevealed = true
        gGame.revealedCount++
        recRevealCells(cell)
    }

    // Update UI and check for victory
    elcell.classList.add(`num-${cell.minesAroundCount}`)
    elcell.classList.add(`revealed`)
    checkVictory()
}

/**
 * Recursively reveals neighbors of an empty cell (Flood Fill)
 */
function recRevealCells(originalCell) {
    let neighbors = getNieghboors(originalCell.location.i, originalCell.location.j)
    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            let cell = gBoard[loc.i][loc.j]
            let elcell = getCell(loc)

            // Stop recursion if mine, flagged, or already revealed
            if (cell.isMine || cell.isMarked || cell.isRevealed) continue;

            cell.isRevealed = true
            gGame.revealedCount++
            elcell.classList.add(`num-${cell.minesAroundCount}`)
            elcell.classList.add(`revealed`)

            if (cell.minesAroundCount === 0) {
                recRevealCells(cell) // Recursive step
            } else {
                elcell.innerText = cell.minesAroundCount
            }
        }
    }
}

/**
 * Handles right-click for flagging/unflagging cells
 */
function flagCell(event, elcell) {
    if (event) event.preventDefault() // Block browser context menu

    if (!gGame.isOn) return;

    let location = extractCellLOcation(elcell)
    let cell = gBoard[location.i][location.j]

    if (cell.isRevealed) return;

    if (cell.isMarked) {
        // Unmark
        cell.isMarked = false
        renderCell(cell.location, ``)
        gRemianingFlags++
    } else {
        // Mark if flags are available
        if (gRemianingFlags > 0) {
            gRemianingFlags--
            cell.isMarked = true
            renderCell(cell.location, FLAG)
        }
    }
    renderFlag(gRemianingFlags)
}

/**
 * Ends the game, stops timer, and updates status face
 */
function endgame(isWin) {
    gGame.isOn = false
    clearInterval(gTimeinterval)
    renderStatus(isWin ? WIN : LOST)
}

/**
 * Increments and updates timer UI
 */
function runTimer() {
    if (!gGame.isOn) return;
    gGame.secsPassed++
    updateTimer(gGame.secsPassed)
}

/**
 * Checks if the number of revealed cells equals the win target
 */
function checkVictory() {
    if (gGame.revealedCount === gPassScore) {
        endgame(true)
    }
}

/**
 * Calculates how many safe cells must be clicked to win
 */
function calcPass() {
    gPassScore = gLevel.SIZE * gLevel.SIZE - gLevel.MINES
}

/**
 * Restarts the game from scratch
 */
function restart() {
    clearInterval(gTimeinterval)
    onInit()
}

/**
 * Starts the timer interval
 */
function startTimer() {
    gTimeinterval = setInterval(runTimer, gIntervalLength)
}

/**
 * Reveals every mine on the board (used on Game Over)
 */
function showAllMines() {
    for (let i = 0; i < gMines.length; i++) {
        renderCell(gMines[i].location, MINE)
        let elCell = getCell(gMines[i].location)
        elCell.classList.add(`revealed`)
    }
}

/**
 * Safe Click Hint: Randomly highlights a non-mine, unrevealed cell
 */
function onSafeClick() {
    if (gSafeClicks <= 0 || !gGame.isOn) return;

    gSafeClicks--
    let arr = gBoard.flat()
    shuffle(arr)

    for (let cell of arr) {
        if (!cell.isMine && !cell.isRevealed) {
            let elCell = getCell(cell.location)
            elCell.classList.add(`flash`) // Highlight
            setTimeout(() => {
                elCell.classList.remove(`flash`) // Remove highlight
            }, 1500)
            renderSafeClicks(gSafeClicks)
            return
        }
    }
}

/**
 * Updates difficulty settings and restarts
 */
function changeDiff(size, mineCount) {
    gLevel.SIZE = size
    gLevel.MINES = mineCount
    restart()
}

/**
 * Prompt-based custom board setup
 */
function customDiff() {
    let size = +prompt(`Enter size (e.g., 10 for 10x10)`)
    let mines = +prompt(`Enter number of mines`)
    if (size && mines) changeDiff(size, mines)
}