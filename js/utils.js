'use strict'

var gColorPalette = [
    '#FF0000',
    '#FFB8FF',
    '#00FFFF',
    '#FFB852',
    '#00FF00',
    '#FFFF00',
    '#FF00FF',
    '#FFFFFF'

];

function getRandomColor() {
    let idx = getRandomIntInclusive(0, gColorPalette.length - 1)
    return gColorPalette[idx]
}


// location such as: {i: 2, j: 7}
function renderCell(location, value) {
    // Select the elCell and set the value
    const elCell = document.querySelector(`.cell-${location.i}-${location.j}`)
    elCell.innerHTML = value
}

function getCell(location) {
    return document.querySelector(`.cell-${location.i}-${location.j}`)
}

function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(items) {
    for (var i = items.length - 1; i > 0; i--) {
        // Pick a random index from 0 to i
        const j = Math.floor(Math.random() * (i + 1));

        // Swap elements items[i] and items[j]
        const temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }
    return items;
}

function renderBoard(mat, selector) {
    const elContainer = document.querySelector(selector)
    elContainer.innerHTML = ``
    var strHTML = `<table class="gameBoard sunk" border="1"><tbody>`
    for (let i = 0; i < mat.length; i++) {
        strHTML += `<tr>`
        for (let j = 0; j < mat[0].length; j++) {
            const cell = mat[i][j]
            const className = `cell cell-` + i + `-` + j
            strHTML += `<td class="${className} ${cell.isRevealed ? 'revealed' : ''} "oncontextmenu="flagCell(event,this)" onClick="revealCell(this)">`
            if (cell.isRevealed) {
                if (cell.isMine) {
                    strHTML += MINE
                } else if (cell.minesAroundCount != 0) {
                    strHTML += cell.minesAroundCount
                } else if (cell.isMarked) {
                    strHTML += FLAG
                }
            }
            strHTML += `</td>`
        }
        strHTML += `</tr>`
    }
    strHTML += `</tbody></table>`
    elContainer.innerHTML = strHTML
}


function extractCellLOcation(elcell) {
    let str = elcell.classList[1]
    let arr = str.split(`-`)
    let location = {
        i: +arr[1],
        j: +arr[2]
    }
    return location
}

function getNieghboors(i, j) {
    let neighbors = [
        { i: i - 1, j: j - 1 }, { i: i - 1, j: j }, { i: i - 1, j: j + 1 },
        { i: i, j: j - 1 }, { i: i, j: j + 1 }, { i: i + 1, j: j - 1 }, { i: i + 1, j: j }, { i: i + 1, j: j + 1 }
    ]
    return neighbors
}

function isOnBoardLocation(location) {
    if (location.i >= 0 && location.i < gBoard.length && location.j >= 0 && location.j < gBoard[0].length) {
        return true
    }
    return false
}

function renderheader(selector) {
    const elContainer = document.querySelector(selector)
    elContainer.innerHTML = ``
    let strHTML = `
    <div class="timer">000</div>
    
    <div class="header-center-group">
        <button type="button" class="status" onclick="restart()">${NORMAL}</button>
        <div class="lives-counter">LIVES: 3</div>
    </div>
    
    <div class="flagCounter">${gRemianingFlags}</div>
`;
    elContainer.innerHTML = strHTML;
}
function renderFlag(count) {
    let elflagCount = document.querySelector(".flagCounter")
    elflagCount.innerText = count
}

function updateTimer(secs) {
    let elTimer = document.querySelector(`.timer`)
    let time = secs
    if (time < 10) {
        time = `00` + secs
    }
    else {
        time = `0` + secs
    }
    elTimer.innerText = time
}


function renderStatus(status) {
    let elStatus = document.querySelector(`.status`)
    elStatus.innerText = status
}

function renderLives(num) {
    let elLives = document.querySelector(`.lives-counter`)
    elLives.innerText = `lives remaining:${num}`
}

function flashCell(elCell, innerText, revertText, game) {
    showCell(elCell)
    let loc = extractCellLOcation(elCell)
    renderCell(loc, innerText)
    setTimeout(() => { unrevealCell(elCell, revertText, game) }, 1000)

}
function unrevealCell(elCell, revertText, game) {
    elCell.classList.remove(`revealed`)
    let loc = extractCellLOcation(elCell)
    renderCell(loc, revertText)
    game.isOn = true
    flagCell(null, elCell)
}

function showCell(elCell) {
    elCell.classList.add(`revealed`)
}
