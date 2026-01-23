const MINE = '💥'
const FLAG = `🚩`
const EMPTY = ``
const NORMAL = `😄`
const LOST = `🤯`
const WIN = `😎`
var gGame = {
    isOn: false,
    revealedCount: 0,
    markedCount: 0,
    secsPassed: 0,
    isFirstClick: true
}
var gMines = []
var gTimeinterval;
var gIntervalLength = 1000
var gLevel = {
    SIZE: 4,
    MINES: 2,
}
var gPassScore = 0
var gBoard = []
var gRemianingFlags = 0

var lastTurn = {
    board: [],
    Game: ``,
}
var gLives = 0
var gBOOM = new Audio(`../audio/boom.wav`)

function onInit() {
    gLives = 0
    gMines = []
    gGame = {
        isOn: false,
        revealedCount: 0,
        markedCount: 0,
        secsPassed: 0,
        isFirstClick: true
    };
    gBoard = [];
    gRemianingFlags = gLevel.MINES;
    calcPass();
    gGame.isOn = true
    buildBoard(gLevel.SIZE, gLevel.MINES)
    gRemianingFlags = gLevel.MINES
    renderheader(`.header-container`)
    renderBoard(gBoard, `.grid-container`)
    renderLives(gLives)
}
function createCell(i, j) {
    let cell = {
        location: {
            i: i,
            j: j
        },
        minesAroundCount: 0,
        isRevealed: false,
        isMine: false,
        isMarked: false,
    }
    return cell
}


function buildBoard(size) {
    gBoard = []
    for (let i = 0; i < size; i++) {
        gBoard[i] = []
        for (let j = 0; j < size; j++) {
            gBoard[i][j] = createCell(i, j)
        }

    }
}

function placeMines(mines, loc) {
    let temp = gBoard.flat()
    shuffle(temp)
    for (let i = 0; i < temp.length; i++) {
        let cell = temp[i]
        if (cell.location.i === loc.i && cell.location.j === loc.j) {
            temp.splice(i, 1)

        }
    }

    for (let i = 0; i < mines; i++) {
        temp[i].isMine = true
        gMines.push(temp[i])
    }

}

function setMinesNegsCount(board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            findNearMines(board[i][j])
        }
    }
}

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


function revealCell(elcell) {
    if (!gGame.isOn) {
        return
    }
    let location = extractCellLOcation(elcell)
    cell = gBoard[location.i][location.j]
    if (gGame.isFirstClick) {
        gGame.isFirstClick = false
        startTimer()
        placeMines(gLevel.MINES, cell.location)
        setMinesNegsCount(gBoard)
    }

    //lose if the cell is mine
    if (cell.isMarked) {
        return
    }
    if (cell.isMine) {
        gBOOM.play()
        if (gLives > 0) {
            gGame.isOn = false
            gLives--
            renderLives(gLives)
            flashCell(elcell, MINE, EMPTY, gGame)
            return

        }
        else {
            endgame(false)
            showAllMines()
            return
        }
    } else if (cell.minesAroundCount != 0) {
        cell.isRevealed = true
        gGame.revealedCount++
        elcell.innerText = cell.minesAroundCount
    }
    else {
        cell.isRevealed = true
        gGame.revealedCount++
        recRevealCells(cell)

    }
    elcell.classList.add(`revealed`)
    checkVictory()
}

function recRevealCells(originalCell) {
    let neighbors = getNieghboors(originalCell.location.i, originalCell.location.j)
    for (let loc of neighbors) {
        if (isOnBoardLocation(loc)) {
            let cell = gBoard[loc.i][loc.j]
            let elcell = getCell(loc)
            if (cell.isMine || cell.isMarked || cell.isRevealed) {
                continue
            } else if (cell.minesAroundCount === 0) {
                cell.isRevealed = true
                gGame.revealedCount++
                elcell.classList.add(`revealed`)
                recRevealCells(cell)
                continue
            } else {
                cell.isRevealed = true
                gGame.revealedCount++
                elcell.classList.add(`revealed`)
                elcell.innerText = cell.minesAroundCount
            }

        }
    }


}

function flagCell(event, elcell) {
    if (event) {
        event.preventDefault()
    }
    if (!gGame.isOn) {
        return
    }
    let location = extractCellLOcation(elcell)
    cell = gBoard[location.i][location.j]
    if (cell.isRevealed) {
        return
    }
    if (cell.isMarked) {
        cell.isMarked = false
        renderCell(cell.location, ``)
        gRemianingFlags++
    } else {
        console.log(`${gRemianingFlags}`)
        if (gRemianingFlags > 0) {
            gRemianingFlags--
            cell.isMarked = true
            renderCell(cell.location, FLAG)
        }

    }
    console.log(gRemianingFlags)
    renderFlag(gRemianingFlags)
}

function timer() {
    gGame.secsPassed++
}


function endgame(isWin) {
    gGame.isOn = false
    clearInterval(gTimeinterval)
    if (isWin) {
        renderStatus(WIN)
        console.log(`Win`)
    } else {
        renderStatus(LOST)
        console.log(`BOOM`)
    }
}

function runTimer() {
    if (!gGame.isOn) {
        return
    }
    console.log(`poopa`)
    timer()
    updateTimer(gGame.secsPassed)
}


function checkVictory() {
    console.log(`revealed count: ${gGame.revealedCount} pass score: ${gPassScore}`)
    if (gGame.revealedCount === gPassScore) {
        endgame(true)
    }
}

function calcPass() {
    gPassScore = gLevel.SIZE * gLevel.SIZE - gLevel.MINES
}


function restart() {
    clearInterval(gTimeinterval)
    onInit()
}

function startTimer() {
    gTimeinterval = setInterval(runTimer, gIntervalLength)
}

function showAllMines() {
    for (let i = 0; i < gMines.length; i++) {
        renderCell(gMines[i].location, MINE)
        let elCell = getCell(gMines[i].location)
        elCell.classList.add(`revealed`)

    }
}

