var mathZone;
var system;

/**
 * @type {HTMLCanvasElement}
 */
var formule_output;

window.addEventListener('load', () => {
	formule_output = document.getElementById('formule_output');
	var xMin = document.getElementById('xmin');
	var xMax = document.getElementById('xmax');
	var yMin = document.getElementById('ymin');
	var yMax = document.getElementById('ymax');
	var xPoints = document.getElementById('xpoints');
	var yPoints = document.getElementById('ypoints');

	document.getElementById('copy_formule_link').addEventListener('click', copyFormuleToClipboard);

	const locationParam = document.location.search + document.location.hash;
	var formule = '(x + 3) * f(x + y)';
	if (locationParam) {
		var parameterList = new URLSearchParams(locationParam)
		parameterList.get('formule')
		if (parameterList.has('formule')) {
			formule = parameterList.get('formule') || formule;
			for (const c of HTMLSpecialChar)
				formule = formule.replaceAll('%' + c.charCodeAt(0).toString(16), c);
		}
		xMin.value = parseFloat(parameterList.get('xmin') || -10);
		xMax.value = parseFloat(parameterList.get('xmax') || 10);
		yMin.value = parseFloat(parameterList.get('ymin') || -10);
		yMax.value = parseFloat(parameterList.get('ymax') || 10);
		xPoints.value = parseFloat(parameterList.get('xpoints') || 10);
		yPoints.value = parseFloat(parameterList.get('ypoints') || 10);
	}


	JigMath.addCustomFunction('f', (x) => 3 * x + 1);
	JigMath.setLogLevel(1);

	const mathContainer = document.getElementById('formule_container');
	mathZone = new EquaColor(mathContainer);
	mathContainer.addEventListener('jigmath_ready', onEquaReady);

	xMin.addEventListener('input', drawFunction);
	xMax.addEventListener('input', drawFunction);
	yMin.addEventListener('input', drawFunction);
	yMax.addEventListener('input', drawFunction);
	xPoints.addEventListener('input', drawFunction);
	yPoints.addEventListener('input', drawFunction);

	mathZone.setFormule(formule);

});

function onEquaReady(event) {
	system = event.detail;
	drawFunction();
}

function getAxisLimit() {
	const xMin = parseFloat(document.getElementById('xmin').value);
	const xMax = parseFloat(document.getElementById('xmax').value);
	const yMin = parseFloat(document.getElementById('ymin').value);
	const yMax = parseFloat(document.getElementById('ymax').value);
	const xDelta = xMax - xMin;
	const yDelta = yMax - yMin;
	const xPoints = parseFloat(document.getElementById('xpoints').value);
	const yPoints = parseFloat(document.getElementById('ypoints').value);
	return {
		xMin, xMax, xPoints, xDelta,
		yMin, yMax, yPoints, yDelta,
	};
}

function drawFunction() {
	console.assert(system);
	var hasError = false;

	const axisLimit = getAxisLimit();

	const width = formule_output.width;
	const height = formule_output.height;
	var ctx = formule_output.getContext('2d');
	ctx.clearRect(0, 0, width, height);
	const xRatio = width / axisLimit.xPoints;
	const yRatio = height / axisLimit.yPoints;

	for (let iY = 0; iY < axisLimit.yPoints; iY++) {

		const y = axisLimit.yMax - (iY + 0.5) / (axisLimit.yPoints) * axisLimit.yDelta;
		system.setVariable('y', y);
		for (let iX = 0; iX < axisLimit.xPoints; iX++) {

			const x = axisLimit.xMin + (iX + 0.5) / (axisLimit.xPoints) * axisLimit.xDelta;
			system.setVariable('x', x);

			const value = system.getValue();

			if (typeof value !== 'number') {
				if (!hasError) {
					console.error(`Equation failed`, { system, value, x, y });
					hasError = true;
				}
				continue;
			}

			var hexColor = Math.min(Math.round(value), 0xFFFFFF).toString(16);
			hexColor = hexColor.padStart(6, '0');
			ctx.fillStyle = '#' + hexColor;

			ctx.fillRect(iX * xRatio, iY * yRatio, xRatio, yRatio);
		}
	}
}

const HTMLSpecialChar = '%#&+';

function copyFormuleToClipboard() {

	var formule = mathZone.getFormule();
	for (const c of HTMLSpecialChar)
		formule = formule.replaceAll(c, '%' + c.charCodeAt(0).toString(16));

	const axisLimit = getAxisLimit();

	var data = `formule=${formule}`
		+ `&xmin=${axisLimit.xMin}&xmax=${axisLimit.xMax}`
		+ `&ymin=${axisLimit.yMin}&ymax=${axisLimit.yMax}`
		+ `&xpoints=${axisLimit.xPoints}&ypoints=${axisLimit.xPoints}`;

	var url = document.location.origin + document.location.pathname;
	url = url + '?' + data;

	navigator.clipboard.writeText(url);
	document.location.assign(url);
	console.log('Copied to clipboard');
}