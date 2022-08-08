const xTileOffset = 0,
	yTileOffset =  0;

const { WebSocket } = require('ws'),
	{ readFileSync } = require('fs'),
	config = require('./config.json');

const art = readFileSync('./art.txt', 'utf-8'),
	lines = art.split('\n');

const charGrid = []
for(i = 0; i < lines.length; i++) {
	let charY = i % 16;

	let chars = lines[i].split('');
	for(j = 0; j < chars.length; j++) {
		charX = j % 16;
		char = chars[j];

		if (!charGrid[i]) charGrid[i] = [];
		charGrid[i][j] = char;
	}
}

let request_id = 1;
function writeTile(tileX, tileY) {
	let xOffset = tileX * 16;
	let yOffset = tileY * 8;
	let time = Date.now();

	let edits = [];
	for(x = 0; x < 16; x++) {
		for(y = 0; y < 8; y++) {
			let gridY = charGrid[y + yOffset]
			if (gridY) {
				edits.unshift([config.y_offset + tileY, config.x_offset + tileX, y, x, time, gridY[x + xOffset], time + x + y])
			}
		}
	}

	ws.send(JSON.stringify({
		kind: 'write',
		request_id: request_id++,
		edits: edits
	}));
}
const socketURL = `wss://www.yourworldoftext.com/${config.world.length > 0 ? config.world + '/' : ''}ws/`;
const ws = new WebSocket(socketURL);

let writeInterval;
ws.on('open', () => {
	console.log('Connection established.');

	let y = 0;
	let x = 0;

	let yMax = charGrid.length / 8;
	let xMax = charGrid[0].length / 16;

	writeInterval = setInterval(() => {
		writeTile(x, y);
		console.log("Wrote: X:%d, Y:%d", x, y);

		y++;
		if (y >= yMax) {
			y = 0;
			x++;

			if (x >= xMax) {
				console.log('Successfully pasted text art.');
				ws.close();

				clearInterval(writeInterval);
			}
		}
	}, 500);
});

ws.on('message', chunk => {
	let res = JSON.parse(chunk.toString());
	if (res.kind === 'error') {
		console.log(res.error);
	}
});

ws.on('close', () => {
	console.log('Connection closed.');

	clearInterval(writeInterval);
});