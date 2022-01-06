/**
 * @param {{submit_blank:boolean}} option
 */
function calcEquation(option)
{
	/**
	 * @type {HTMLTextAreaElement}
	 */
	var input = document.getElementById('entree_equation');
	/**
	 * @type {HTMLTextAreaElement}
	 */
	var output = document.getElementById('sortie_equation');
	output.value = '';

	const formule = input.value;
	if (formule == '') {
		input.value = 'Formule vide !';
		return;
	}
	/**
	 * @type {HtmlSelectElement}
	 */
	const version = document.querySelector('select#version')?.value;
	var resultat;
	if (version === 'vjig0ll')
		resultat = getResultat(formule);
	else if (version === 'vjigmath')
		resultat = getResultatJig(formule);
	else {
		alert(`Version invalide : ${version}`);
		return;
	}

	output.value = resultat;
}

/**
 * @param {string} formule
 */
function getResultat(formule)
{
	/**
	 * @type {HTMLTextAreaElement}
	 */
	const outputSteps = document.getElementById('etapes_equation');
	outputSteps.value = '...';
	var steps = [];

	formule = formule.replace(/^f\([\w,]+\)=/, '');
	const formuleS = MATH.parseMath(formule, steps);

	const start = Date.now();
	var duree = 0;
	var i = 0;
	while ((duree = Date.now() - start) < 100) {
		i++;
		MATH.parseMath(formule);
	}

	steps.push(`Opérations par secondes : ${i / duree * 1000} (${i} en ${duree} ms)`);
	outputSteps.value = steps.join('\n');
	return formuleS;
}

/**
 * @param {string} formule
 */
function getResultatJig(formule)
{
	/**
	 * @type {HTMLTextAreaElement}
	 */
	const outputSteps = document.getElementById('etapes_equation');
	outputSteps.value = '...';

	formule = formule.replace(/^f\([\w,]+\)=/, '');
	const readyToCalc = JigMath(formule, 'advanced');
	readyToCalc.declareVariable('x');
	readyToCalc.setVariable('x', 2);
	var formuleS = readyToCalc.getValue();

	const start = Date.now();
	var duree = 0;
	var i = 0;
	while ((duree = Date.now() - start) < 100) {
		i++;
		formuleS = readyToCalc.getValue();
	}

	outputSteps.value = `Opérations par secondes : ${i / duree * 1000} (${i} en ${duree} ms)`;
	return formuleS;
}

window.addEventListener('load', () => {
	const calc = document.querySelector('#calc');

	calc.addEventListener('mousedown', e => {
		if (e.button === 1) e.preventDefault();
	});
	calc.addEventListener('mouseup', e => {
		if (e.button === 1) calcEquation({submit_blank : true});
	});
	calc.addEventListener('click', e => {
		if (e.ctrlKey)
			calcEquation({submit_blank : true});
		else
			calcEquation();
	});
});
