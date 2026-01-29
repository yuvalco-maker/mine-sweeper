/**
 * MINESWEEPER - RENDERING & UTILITY FUNCTIONS
 */

'use strict'

/**
 * Updates a specific cell's content in the DOM based on its coordinates
 * @param {Object} location - {i, j} coordinates
 * @param {String} value - The content to display (MINE, FLAG, number, etc.)
 */
function renderCell(location, value) {
    const elCell = document.querySelector(`.cell-${location.i}-${location.j}`)
    if (elCell) elCell.innerHTML = value
}

/**
 * Helper to grab a DOM element by its board coordinates
 */
function getCell(location) {
    return document.querySelector(`.cell-${location.i}-${location.j}`)
}

/**
 * Generates a random integer between min and max (inclusive)
 */
function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Fisher-Yates Shuffle algorithm to randomize mine placement
 */
function shuffle(items) {
    for (var i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }
    return items;
}

/**
 * Builds and injects the HTML table for the game board
 * @param {Array} mat - The 2D array representing the game board logic
 * @param {String} selector - CSS selector for the container
 */
function renderBoard(mat, selector) {
    const elContainer = document.querySelector(selector)
    elContainer.innerHTML = ``

    // Start building the table string
    var strHTML = `<table class="gameBoard sunk" border="1"><tbody>`

    for (let i = 0; i < mat.length; i++) {
        strHTML += `<tr>`
        for (let j = 0; j < mat[0].length; j++) {
            const cell = mat[i][j]

            // Determine if the cell should have a color class for numbers
            var colorClass = (cell.isRevealed && cell.minesAroundCount > 0 && !cell.isMine)
                ? `num-${cell.minesAroundCount}`
                : ''

            // Combine all necessary classes
            const className = `cell cell-${i}-${j} ${cell.isRevealed ? 'revealed' : ''} ${colorClass}`

            // Create cell with event listeners for click and right-click
            strHTML += `<td class="${className}" oncontextmenu="flagCell(event,this)" onClick="revealCell(this)">`

            // Render content only if revealed or marked
            if (cell.isRevealed) {
                if (cell.isMine) {
                    strHTML += MINE
                } else if (cell.minesAroundCount !== 0) {
                    strHTML += cell.minesAroundCount
                }
            } else if (cell.isMarked) {
                strHTML += FLAG
            }

            strHTML += `</td>`
        }
        strHTML += `</tr>`
    }
    strHTML += `</tbody></table>`
    elContainer.innerHTML = strHTML
}

/**
 * Parses the coordinate info from a DOM element's class (e.g., "cell-2-5")
 */
function extractCellLOcation(elcell) {
    let str = elcell.classList[1] // Assumes 'cell-i-j' is the second class
    let arr = str.split(`-`)
    return {
        i: +arr[1],
        j: +arr[2]
    }
}

/**
 * Returns an array of coordinate objects for all 8 surrounding neighbors
 */
function getNieghboors(i, j) {
    return [
        { i: i - 1, j: j - 1 }, { i: i - 1, j: j }, { i: i - 1, j: j + 1 },
        { i: i, j: j - 1 }, { i: i, j: j + 1 },
        { i: i + 1, j: j - 1 }, { i: i + 1, j: j }, { i: i + 1, j: j + 1 }
    ]
}

/**
 * Checks if a given coordinate is actually within the board boundaries
 */
function isOnBoardLocation(location) {
    return (location.i >= 0 && location.i < gBoard.length &&
        location.j >= 0 && location.j < gBoard[0].length);
}

/**
 * Renders the top UI bar (Timer, Restart Button, Flag Counter, Lives, Safe-Clicks)
 */
function renderheader(selector) {
    const elContainer = document.querySelector(selector)
    elContainer.innerHTML = `
    <div class="header-wrapper">
        <div class="upper-control">
            <div class="timer">000</div>
            <button type="button" class="status" onclick="restart()">${NORMAL}</button>
            <div class="flagCounter">${gRemianingFlags}</div>
        </div>

        <div class="lower-control">
            <button type="button" class="safeClicks" onClick="onSafeClick()">Safe-Clicks: 3</button>
            <div class="lives-counter">LIVES: 3</div>
            <button type="button" class="standart_button" onClick="hint()">𖡊𖡊𖡊</button>
        </div>
    </div>
`;
}

/**
 * Updates the flag counter display
 */
function renderFlag(count) {
    let elflagCount = document.querySelector(".flagCounter")
    if (elflagCount) elflagCount.innerText = count
}

/**
 * Formats and updates the timer display (e.g., 005 or 042)
 */
function updateTimer(secs) {
    let elTimer = document.querySelector(`.timer`)
    if (!elTimer) return
    let time = secs
    if (time < 10) time = `00` + secs
    else if (time < 100) time = `0` + secs

    elTimer.innerText = time
}

/**
 * Updates the "Smiley Face" button status
 */
function renderStatus(status) {
    let elStatus = document.querySelector(`.status`)
    if (elStatus) elStatus.innerText = status
}

/**
 * Updates the Lives UI text
 */
function renderLives(num) {
    let elLives = document.querySelector(`.lives-counter`)
    if (elLives) elLives.innerText = `lives remaining: ${num}`
}

/**
 * Updates the Safe-Clicks remaining UI text
 */
function renderSafeClicks(num) {
    let elSafe = document.querySelector(`.safeClicks`)
    if (elSafe) elSafe.innerText = `safe-clicks remaining: ${num}`
}

/**
 * Briefly reveals a cell (used when hitting a mine with lives remaining)
 */
function flashCell(elCell, innerText, revertText, game,bool=false) {
    showCell(elCell)
    let loc = extractCellLOcation(elCell)
    renderCell(loc, innerText)
    setTimeout(() => { unrevealCell(elCell, revertText, game,bool) }, 1000)
}

/**
 * Reverts a "flashed" cell back to its hidden/flagged state
 */
function unrevealCell(elCell, revertText, game,bool) {
    elCell.classList.remove(`revealed`)
    let loc = extractCellLOcation(elCell)
    renderCell(loc, revertText)
    game.isOn = true // Resume game
    if(!bool){
    flagCell(null, elCell) // Automatically re-flag it for safety
    }
}

/**
 * Applies the 'revealed' CSS class to a cell
 */
function showCell(elCell) {
    elCell.classList.add(`revealed`)
}

/**
 * Renders the difficulty selection buttons
 */
function renderdiff(selector) {
    const elContainer = document.querySelector(selector)
    elContainer.innerHTML = `
   <button type="button" class="diff easy" onClick="changeDiff(4,2,'Beginer')">beginner</button>
   <button type="button" class="diff normal" onClick="changeDiff(8,12,'Medium')">medium</button>
   <button type="button" class="diff hard" onClick="changeDiff(14,32,'Expert')">expert</button>
   <button type="button" class="diff custom" onClick="customDiff()">custom</button>
`;
}

function toggletheme() {
    const html = document.documentElement;
    const currentTheme = html.style.colorScheme;
    if (currentTheme === `dark`) {
        html.style.colorScheme = `light`;
    } else {
        html.style.colorScheme = `dark`;
    }
}

function renderCurrDiffText(diff) {
    let elDiff = document.querySelector(`.curr_diff`)
    elDiff.innerText = diff

}

function getHighScore(difficulty) {
    let highScore = +localStorage.getItem(difficulty)
    // if theres no highscore for this level we set it to zero for consistency 
    if (highScore === null) {
        highScore = 0
        localStorage.setItem(difficulty, JSON.stringify(highScore))
    }
    return highScore
}

function updateHighScore(difficulty, score) {
    if (score > getHighScore(difficulty)) {
        localStorage.setItem(difficulty, JSON.stringify(score))
    }
}

function renderHighScore(score) {
    let elScore = document.querySelector(`.high_score`)
    elScore.innerText = score
}

function renderHints(img,bool){
    let elHints = document.querySelector(`.standart_button`)
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(elHints.innerHTML)).map(s => s.segment);
    if(bool===true){    
        elHints.innerHTML= segments[1]+segments[2]+img
        
    }
    else{
        elHints.innerHTML= img+ segments[0]+segments[1]
    }
}