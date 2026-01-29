/**
 * MINESWEEPER - MAIN GAME LOGIC
 * Manages game state, board generation, and player interactions.
 */

// --- CONSTANTS: Visual symbols for cell states ---
const MINE = '💥'
const FLAG = `🚩`
const EMPTY = ``
const NORMAL = `😄`
const LOST = `🤯`
const WIN = `😎`
const usedHint = `💡`
const unusedHint = `𖡊`

// --- GLOBAL STATE: Tracks the current game session ---
var gGame = {
    isOn: false,           // Is the game currently active?
    revealedCount: 0,      // Number of safe cells clicked
    markedCount: 0,        // Number of flags placed
    secsPassed: 0,         // Time elapsed
    isFirstClick: true,    // Used to prevent losing on the first move
    hints: 3,              // Number of hints remaining
    hint_toggle: false     // Is hint mode currently "armed"?
}

var gMines = []            // Array of cell objects that contain mines
var gTimeinterval;         // Pointer for the timer interval
var gIntervalLength = 1000 // Tick speed (1 second)
var gLevel = {             // Difficulty settings
    SIZE: 4,
    MINES: 2,
    DIFFICULTY: 'Beginer'
}
var gSafeClicks = 0        // Remaining safe-click powerups
var gPassScore = 0         // Goal revealedCount to trigger a win
var gBoard = []            // The logical 2D array (Matrix)
var gRemianingFlags = 0    // Total flags player can still place
var gLives = 0             // Player's health points
var gBOOM = new Audio(`../audio/boom.wav`) // Explosion sound effect

/**
 * Initialization: Resets variables and UI for a new game
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
        isFirstClick: true,
        hints: 3,
        hint_toggle: false
    };
    gBoard = [];
    gRemianingFlags = gLevel.MINES;

    calcPass();               // Calculate winning threshold
    buildBoard(gLevel.SIZE);  // Create the logic matrix

    // Render initial UI components
    renderheader(`.header-container`)
    renderBoard(gBoard, `.grid-container`)
    renderLives(gLives)
    renderSafeClicks(gSafeClicks)
    renderdiff(`.diff-container`)
    renderCurrDiffText(gLevel.DIFFICULTY)
    renderHighScore(getHighScore(gLevel.DIFFICULTY))
}

/**
 * Logic Setup: Creates the data object for an individual cell
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
 * Logic Setup: Fills gBoard with cell objects
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
 * Mine Placement: Distributes mines randomly while ensuring 
 * the first clicked cell is always safe.
 */
function placeMines(mines, loc) {
    let temp = gBoard.flat() // Convert 2D array to 1D for easier shuffling
    shuffle(temp)

    // Remove the current clicked cell from the pool of potential mine locations
    for (let i = 0; i < temp.length; i++) {
        let cell = temp[i]
        if (cell.location.i === loc.i && cell.location.j === loc.j) {
            temp.splice(i, 1)
            break;
        }
    }

    // Assign mines to the first 'n' cells in the randomized pool
    for (let i = 0; i < mines; i++) {
        temp[i].isMine = true
        gMines.push(temp[i])
    }
}

/**
 * Neighbor Calculation: Triggers neighbor counting for every cell
 */
function setMinesNegsCount(board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            findNearMines(board[i][j])
        }
    }
}

/**
 * Neighbor Calculation: Logic to count how many mines touch a specific cell
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
 * Input Handler: Main logic for left-clicking a cell.
 * Handles hints, first-click safety, mine hits, and reveals.
 */
function revealCell(elcell) {
    const location = extractCellLOcation(elcell)
    const cell = gBoard[location.i][location.j]

    // Exit if game over, already open, or flagged
    if (!gGame.isOn || cell.isRevealed || cell.isMarked) return;

    // Execute Hint logic if the hint button was toggled on
    if (gGame.hint_toggle) {
        showHint(elcell);
        return; 
    }

    // Handle game start on the very first click
    if (gGame.isFirstClick) {
        gGame.isFirstClick = false
        startTimer()
        placeMines(gLevel.MINES, cell.location)
        setMinesNegsCount(gBoard)
    }

    // Handle hitting a mine
    if (cell.isMine) {
        gBOOM.play()
        if (gLives > 0) {
            // Deduct life and briefly show mine (using flashCell)
            gGame.isOn = false
            gLives--
            renderLives(gLives)
            flashCell(elcell, MINE, EMPTY, gGame)
            return
        } else {
            // Game Over sequence
            endgame(false)
            showAllMines()
            return
        }
    } 
    
    // Normal reveal for safe cells
    if (cell.minesAroundCount !== 0) {
        cell.isRevealed = true
        gGame.revealedCount++
        elcell.innerText = cell.minesAroundCount
    } else {
        // Trigger recursion for empty areas (0 neighbor mines)
        cell.isRevealed = true
        gGame.revealedCount++
        recRevealCells(cell)
    }

    // Add CSS classes and check if the player won
    elcell.classList.add(`num-${cell.minesAroundCount}`)
    elcell.classList.add(`revealed`)
    checkVictory()
}

/**
 * Recursion: Flood-fill algorithm to open all adjacent empty cells
 */
function recRevealCells(originalCell) {
    let neighbors = getNieghboors(originalCell.location.i, originalCell.location.j)
    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            let cell = gBoard[loc.i][loc.j]
            let elcell = getCell(loc)

            // Stop recursion at boundaries (mines, flags, or already open cells)
            if (cell.isMine || cell.isMarked || cell.isRevealed) continue;

            cell.isRevealed = true
            gGame.revealedCount++
            elcell.classList.add(`num-${cell.minesAroundCount}`)
            elcell.classList.add(`revealed`)

            // If neighbor is also empty, keep recursing
            if (cell.minesAroundCount === 0) {
                recRevealCells(cell)
            } else {
                elcell.innerText = cell.minesAroundCount
            }
        }
    }
}

/**
 * Input Handler: Right-click logic for marking potential mines
 */
function flagCell(event, elcell) {
    if (event) event.preventDefault() // Block browser menu

    if (!gGame.isOn) return;

    let location = extractCellLOcation(elcell)
    let cell = gBoard[location.i][location.j]

    if (cell.isRevealed) return;

    if (cell.isMarked) {
        // Remove flag
        cell.isMarked = false
        renderCell(cell.location, ``)
        gRemianingFlags++
    } else {
        // Place flag if available
        if (gRemianingFlags > 0) {
            gRemianingFlags--
            cell.isMarked = true
            renderCell(cell.location, FLAG)
        }
    }
    renderFlag(gRemianingFlags)
}

/**
 * Game Flow: Stops game, kills timer, and updates UI on win/loss
 */
function endgame(isWin) {
    gGame.isOn = false
    clearInterval(gTimeinterval)
    renderStatus(isWin ? WIN : LOST)
    if (isWin) {
        updateHighScore(gLevel.DIFFICULTY, gGame.secsPassed)
        renderHighScore(gGame.secsPassed)
    }
}

/**
 * Game Flow: Logic to advance the clock
 */
function runTimer() {
    if (!gGame.isOn) return;
    gGame.secsPassed++
    updateTimer(gGame.secsPassed)
}

/**
 * Win Condition: Checks if enough cells have been revealed
 */
function checkVictory() {
    if (gGame.revealedCount === gPassScore) {
        endgame(true)
    }
}

/**
 * Setup: Calculates total safe cells in the current grid size
 */
function calcPass() {
    gPassScore = gLevel.SIZE * gLevel.SIZE - gLevel.MINES
}

/**
 * Game Flow: Reset everything back to Init state
 */
function restart() {
    clearInterval(gTimeinterval)
    onInit()
}

/**
 * Setup: Initialized the clock interval
 */
function startTimer() {
    gTimeinterval = setInterval(runTimer, gIntervalLength)
}

/**
 * Game Flow: Reveals all mines (used when the player loses)
 */
function showAllMines() {
    for (let i = 0; i < gMines.length; i++) {
        renderCell(gMines[i].location, MINE)
        let elCell = getCell(gMines[i].location)
        elCell.classList.add(`revealed`)
    }
}

/**
 * Powerup: Safe Click. Randomly picks and highlights a safe, unrevealed cell.
 */
function onSafeClick() {
    if (gSafeClicks <= 0 || !gGame.isOn) return;

    gSafeClicks--
    let arr = gBoard.flat()
    shuffle(arr)

    for (let cell of arr) {
        if (!cell.isMine && !cell.isRevealed) {
            let elCell = getCell(cell.location)
            elCell.classList.add(`flash`)
            setTimeout(() => {
                elCell.classList.remove(`flash`)
            }, 1500)
            renderSafeClicks(gSafeClicks)
            return
        }
    }
}

/**
 * Setup: Updates level parameters and triggers a reset
 */
function changeDiff(size, mineCount, diff) {
    gLevel.SIZE = size
    gLevel.MINES = mineCount
    gLevel.DIFFICULTY = diff
    restart()
}

/**
 * Setup: Logic for custom board dimensions via user input
 */
function customDiff() {
    let size = +prompt(`Enter size (e.g., 10 for 10x10)`)
    let mines = +prompt(`Enter number of mines`)
    if (size && mines) changeDiff(size, mines, 'custom')
}

/**
 * Powerup: Hint Toggle. Arms/Disarms the hint mode and updates the UI button.
 */
function hint(){
    if(gGame.isFirstClick){
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: "Can't hint on first click!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        return;
    }
    if(!gGame.isOn) return;
    
    // Check if player has hints left
    if(gGame.hints <= 0 && gGame.hint_toggle === false) return;
    
    if(gGame.hint_toggle === true){
        // Disarm hint
        gGame.hints++;
        renderHints(unusedHint, false);
        gGame.hint_toggle = false;
    } else {
        // Arm hint
        gGame.hints--;
        renderHints(usedHint, true);
        gGame.hint_toggle = true;
    }
}

/**
 * Powerup Logic: Briefly reveals a 3x3 area around the clicked cell.
 */
function showHint(elcell) {
    if (!gGame.hint_toggle) return;

    let location = extractCellLOcation(elcell);
    let neighbors = getNieghboors(location.i, location.j);
    neighbors.push(location); // Include the center cell

    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            const cellData = gBoard[loc.i][loc.j];
            const elNeighbor = getCell(loc); 

            // Temporary reveal: Only for unrevealed cells
            if (!cellData.isRevealed) {
                const content = getCellcontent(cellData);
                // The true parameter indicates this is a hint flash (no mine auto-flagging)
                flashCell(elNeighbor, content, elNeighbor.innerHTML, gGame, true);
            }
        }
    }
    // Auto-disarm hint after one use
    gGame.hint_toggle = false;
}

/**
 * Helper: Converts the internal cell object's state into a visual string
 */
function getCellcontent(cell){
    if(cell.isMine) return MINE;
    if(cell.minesAroundCount > 0) return cell.minesAroundCount;
    return EMPTY;
}